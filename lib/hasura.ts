// GraphQL client for Hasura. Two flavours:
//   - hasuraAdmin: uses X-Hasura-Admin-Secret. For server-side trusted ops
//     (next-auth user upsert, Actions, seeds). Bypasses all permissions.
//   - hasuraAsUser: uses a Bearer JWT. For server-side calls on behalf of
//     a user (RSC, Server Actions). Respects RLS.

import { GraphQLClient } from 'graphql-request';

const endpoint = process.env.HASURA_GRAPHQL_ENDPOINT!;
const adminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET!;

if (!endpoint || !adminSecret) {
  // Bare check — useful in CI but next-auth callbacks need this at runtime.
  if (typeof window === 'undefined') {
    console.warn('HASURA_GRAPHQL_ENDPOINT / HASURA_GRAPHQL_ADMIN_SECRET missing');
  }
}

export const hasuraAdmin = new GraphQLClient(endpoint, {
  headers: { 'X-Hasura-Admin-Secret': adminSecret },
});

export function hasuraAsUser(jwt: string, role?: string, communityId?: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${jwt}` };
  if (role) headers['X-Hasura-Role'] = role;
  if (communityId) headers['X-Hasura-Community-Id'] = communityId;
  return new GraphQLClient(endpoint, { headers });
}

// Convenience for server components / server actions: build a JWT-authed client
// from the current next-auth session. Throws if no session — callers must
// ensure auth() has succeeded.
export async function hasuraAsCurrentUser(opts: { role?: string; communityId?: string } = {}) {
  const { auth } = await import('./auth');
  const session = await auth();
  if (!session?.hasuraToken) throw new Error('No active Hasura session');
  return hasuraAsUser(
    session.hasuraToken,
    opts.role ?? session.hasura.default_role,
    opts.communityId ?? session.hasura.community_id,
  );
}
