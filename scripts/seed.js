// One-time seed: creates a test community and grants ADMIN membership to
// the given email. The user is pre-created with email only — when they sign
// in via Google, next-auth's UPSERT_USER refreshes their record without
// creating a duplicate.
//
// Usage:
//   node scripts/seed.js you@example.com [--community-slug=menorah-tlv] [--community-name="Menorah Tel Aviv"]

'use strict';

require('dotenv').config();
const { GraphQLClient, gql } = require('graphql-request');

const endpoint = process.env.HASURA_GRAPHQL_ENDPOINT;
const adminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
if (!endpoint || !adminSecret) {
  console.error('HASURA_GRAPHQL_ENDPOINT and HASURA_GRAPHQL_ADMIN_SECRET required in .env');
  process.exit(1);
}

const args = process.argv.slice(2);
const adminEmail = args.find((a) => !a.startsWith('--'));
if (!adminEmail || !adminEmail.includes('@')) {
  console.error('Provide admin email as first argument.');
  console.error('Usage: node scripts/seed.js you@example.com');
  process.exit(1);
}
const arg = (k, def) => {
  const a = args.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split('=').slice(1).join('=') : def;
};
const communitySlug = arg('community-slug', 'menorah-test');
const communityName = arg('community-name', 'Menorah · Test Community');

const client = new GraphQLClient(endpoint, {
  headers: { 'X-Hasura-Admin-Secret': adminSecret },
});

const UPSERT_COMMUNITY = gql`
  mutation UpsertCommunity($slug: citext!, $name: String!) {
    insert_communities_one(
      object: {
        slug: $slug, name: $name, timezone: "Asia/Jerusalem",
        settings: { open_signup: true }
      }
      on_conflict: { constraint: communities_slug_key, update_columns: [name] }
    ) { id slug name }
  }
`;

const UPSERT_USER = gql`
  mutation UpsertUser($email: citext!) {
    insert_users_one(
      object: { email: $email, first_signup_path: invite }
      on_conflict: { constraint: users_email_key, update_columns: [last_seen_at] }
    ) { id email }
  }
`;

const UPSERT_MEMBERSHIP = gql`
  mutation UpsertMembership($user_id: uuid!, $community_id: uuid!) {
    insert_memberships_one(
      object: {
        user_id: $user_id, community_id: $community_id,
        role: admin, status: active, entry_method: rabbi_added,
        joined_at: "now()"
      }
      on_conflict: {
        constraint: memberships_user_community_unique
        update_columns: [role, status, joined_at]
      }
    ) { id role status }
  }
`;

const WRITE_AUDIT = gql`
  mutation WriteAudit($user_id: uuid!, $community_id: uuid!, $action: String!, $metadata: jsonb!) {
    insert_audit_log_one(object: {
      actor_user_id: $user_id, community_id: $community_id, action: $action, metadata: $metadata
    }) { id }
  }
`;

(async () => {
  console.log(`Seeding community "${communityName}" (slug=${communitySlug}) with admin ${adminEmail}...`);

  const c = await client.request(UPSERT_COMMUNITY, { slug: communitySlug, name: communityName });
  console.log('  community:', c.insert_communities_one);

  const u = await client.request(UPSERT_USER, { email: adminEmail });
  console.log('  user:', u.insert_users_one);

  const m = await client.request(UPSERT_MEMBERSHIP, {
    user_id: u.insert_users_one.id,
    community_id: c.insert_communities_one.id,
  });
  console.log('  membership:', m.insert_memberships_one);

  await client.request(WRITE_AUDIT, {
    user_id: u.insert_users_one.id,
    community_id: c.insert_communities_one.id,
    action: 'seed.admin_granted',
    metadata: { email: adminEmail, source: 'scripts/seed.js' },
  });

  console.log('\n✅ Done. Sign in with Google as', adminEmail, '— you will be admin of', communitySlug);
})().catch((e) => {
  console.error('FAILED:', e.message);
  if (e.response?.errors) console.error(JSON.stringify(e.response.errors, null, 2));
  process.exit(1);
});
