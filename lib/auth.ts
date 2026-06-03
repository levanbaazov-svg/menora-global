// Auth.js v5 (next-auth@beta) — Node-runtime configuration.
//
// Flow:
// 1. User signs in with Google.
// 2. `jwt` callback runs once after sign-in (and on every session refresh).
//    - First time: upsert into Hasura `users` + `accounts`, fetch active memberships.
//    - Always: refresh memberships (roles can change) and sign a Hasura-targeted
//      RS256 JWT carrying the right claims.
// 3. `session` callback (in auth.config) exposes the JWT-encoded data to client.

import NextAuth from 'next-auth';
import { SignJWT } from 'jose';
import { authConfig } from './auth.config';
import { hasuraAdmin } from './hasura';
import { getJwtKeys } from './jwt-keys';
import type { HasuraClaims } from '@/types/next-auth';

// ── GraphQL queries ──────────────────────────────────────────────────────────
const UPSERT_USER = /* GraphQL */ `
  mutation UpsertUser($email: citext!, $name: String, $image_url: String) {
    insert_users_one(
      object: { email: $email, name: $name, image_url: $image_url, email_verified_at: "now()" }
      on_conflict: {
        constraint: users_email_key
        update_columns: [name, image_url, last_seen_at]
      }
    ) { id email }
  }
`;

const UPSERT_ACCOUNT = /* GraphQL */ `
  mutation UpsertAccount(
    $user_id: uuid!, $provider: String!, $provider_account_id: String!,
    $type: String!, $access_token: String, $refresh_token: String,
    $id_token: String, $expires_at: bigint, $token_type: String, $scope: String
  ) {
    insert_accounts_one(
      object: {
        user_id: $user_id, provider: $provider, provider_account_id: $provider_account_id,
        type: $type, access_token: $access_token, refresh_token: $refresh_token,
        id_token: $id_token, expires_at: $expires_at, token_type: $token_type, scope: $scope
      }
      on_conflict: {
        constraint: accounts_provider_account_unique
        update_columns: [access_token, refresh_token, id_token, expires_at, token_type, scope]
      }
    ) { id }
  }
`;

const SESSION_BOOTSTRAP = /* GraphQL */ `
  query SessionBootstrap($user_id: uuid!) {
    users_by_pk(id: $user_id) { onboarding_step onboarded_at tutorial_completed }
    memberships(where: { user_id: { _eq: $user_id }, status: { _eq: active } }) {
      community_id role
    }
  }
`;

// ── Hasura JWT signing ───────────────────────────────────────────────────────
const HASURA_JWT_TTL_SECONDS = 60 * 60;

async function signHasuraJWT(userId: string, claims: HasuraClaims): Promise<{ token: string; exp: number }> {
  const { privateKey, kid } = await getJwtKeys();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + HASURA_JWT_TTL_SECONDS;

  // Hasura quirk: built-in claims like `allowed_roles` accept JSON arrays,
  // but CUSTOM session vars (anything not in Hasura's known list) must be
  // strings. For `allowed_community_ids` we encode as a Postgres array
  // literal `{uuid1,uuid2}` so the `_in` filter parses it correctly.
  const allowedCommunityIdsStr = `{${claims.allowed_community_ids.join(',')}}`;

  const token = await new SignJWT({
    hasura: {
      allowed_roles: claims.allowed_roles,
      default_role: claims.default_role,
      community_id: claims.community_id,
      allowed_community_ids: allowedCommunityIdsStr,
    },
  })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuer('menora-global')
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(privateKey);

  return { token, exp };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function upsertUserAndAccount(args: {
  email: string; name?: string | null; image?: string | null;
  provider: string; providerAccountId: string;
  access_token?: string; refresh_token?: string; id_token?: string;
  expires_at?: number; token_type?: string; scope?: string;
}): Promise<string> {
  const u = await hasuraAdmin.request<{ insert_users_one: { id: string } }>(UPSERT_USER, {
    email: args.email, name: args.name, image_url: args.image,
  });
  await hasuraAdmin.request(UPSERT_ACCOUNT, {
    user_id: u.insert_users_one.id,
    provider: args.provider,
    provider_account_id: args.providerAccountId,
    type: 'oauth',
    access_token: args.access_token ?? null,
    refresh_token: args.refresh_token ?? null,
    id_token: args.id_token ?? null,
    expires_at: args.expires_at ?? null,
    token_type: args.token_type ?? null,
    scope: args.scope ?? null,
  });
  return u.insert_users_one.id;
}

interface SessionBootstrap {
  claims: HasuraClaims;
  onboardingStep: string;
  onboardedAt: string | null;
  hasMembership: boolean;
}

async function bootstrapSession(userId: string): Promise<SessionBootstrap> {
  const res = await hasuraAdmin.request<{
    users_by_pk: { onboarding_step: string; onboarded_at: string | null; tutorial_completed: boolean } | null;
    memberships: Array<{ community_id: string; role: 'member' | 'rabbi' | 'admin' }>;
  }>(SESSION_BOOTSTRAP, { user_id: userId });

  const communityIds = res.memberships.map((m) => m.community_id);
  const roles = new Set<string>(['member']);
  for (const m of res.memberships) {
    if (m.role === 'rabbi' || m.role === 'admin') roles.add(m.role);
  }

  const allowed = Array.from(roles);
  const def = allowed.includes('admin') ? 'admin'
            : allowed.includes('rabbi') ? 'rabbi'
            : 'member';

  return {
    claims: {
      allowed_roles: allowed,
      default_role: def,
      community_id: communityIds[0] ?? '00000000-0000-0000-0000-000000000000',
      allowed_community_ids: communityIds,
    },
    onboardingStep: res.users_by_pk?.onboarding_step ?? 'signup',
    onboardedAt: res.users_by_pk?.onboarded_at ?? null,
    hasMembership: communityIds.length > 0,
  };
}

// ── Auth.js v5 export ────────────────────────────────────────────────────────
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  // Trust the deployment host header. Required for self-hosted / `next start`
  // (Vercel sets this automatically). Without it Auth.js throws UntrustedHost
  // and sessions break in production.
  trustHost: true,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account, profile, user, trigger }) {
      // E2E test sign-in (credentials provider 'e2e', only when E2E_TEST_SECRET
      // is set): resolve the real Hasura user id by email. No OAuth involved.
      if (account?.provider === 'e2e' && !token.userId) {
        const email = (user?.email ?? token.email) as string | undefined;
        if (email) {
          const r = await hasuraAdmin.request<{ users: Array<{ id: string }> }>(
            `query($e: citext!){ users(where: { email: { _eq: $e } }, limit: 1) { id } }`,
            { e: email },
          );
          if (r.users[0]) token.userId = r.users[0].id;
        }
      }

      // First-time sign-in: upsert user, link account
      if (account && profile) {
        const email = profile.email ?? token.email;
        if (typeof email !== 'string') throw new Error('Google profile missing email');
        token.userId = await upsertUserAndAccount({
          email,
          name: typeof profile.name === 'string' ? profile.name : null,
          image: typeof (profile as { picture?: unknown }).picture === 'string'
            ? (profile as { picture: string }).picture
            : null,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          id_token: account.id_token,
          expires_at: account.expires_at,
          token_type: account.token_type ?? undefined,
          scope: account.scope,
        });
      }

      // Re-issue Hasura JWT if expired, never set, or on explicit refresh
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = token.hasuraTokenExpiresAt ?? 0;
      // Also refresh while the user has no community yet, so a freshly-joined
      // community + role appear on the next request instead of after the 1h TTL.
      const needsRefresh =
        !token.hasuraToken || expiresAt - now < 60 || trigger === 'update' || !token.hasMembership;

      if (token.userId && needsRefresh) {
        const boot = await bootstrapSession(token.userId);
        const { token: hjwt, exp } = await signHasuraJWT(token.userId, boot.claims);
        token.hasura = boot.claims;
        token.hasuraToken = hjwt;
        token.hasuraTokenExpiresAt = exp;
        token.onboardingStep = boot.onboardingStep;
        token.hasMembership = boot.hasMembership;
      }

      return token;
    },
  },
});
