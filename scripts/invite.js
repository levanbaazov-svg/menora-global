// Issues an invitation: generates a token, stores only its SHA-256 hash,
// prints the magic link to send by email.
//
// Usage:
//   node scripts/invite.js --community=menorah-test --email=guest@x.com [--role=member]

'use strict';

require('dotenv').config();
const { randomBytes, createHash } = require('node:crypto');
const { GraphQLClient, gql } = require('graphql-request');

const endpoint = process.env.HASURA_GRAPHQL_ENDPOINT;
const adminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

const argMap = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => a.replace(/^--/, '').split(/=(.+)/).slice(0, 2)),
);

const { community, email } = argMap;
const role = argMap.role || 'member';
const ttlDays = parseInt(argMap.ttl || '14', 10);

if (!community || !email) {
  console.error('Usage: node scripts/invite.js --community=<slug> --email=<who> [--role=member|rabbi|admin] [--ttl=14]');
  process.exit(1);
}

const client = new GraphQLClient(endpoint, {
  headers: { 'X-Hasura-Admin-Secret': adminSecret },
});

const FIND_COMMUNITY = gql`
  query FindCommunity($slug: citext!) {
    communities(where: { slug: { _eq: $slug } }, limit: 1) { id name }
  }
`;
const INSERT_INVITATION = gql`
  mutation InsertInvitation(
    $community_id: uuid!, $email: citext!,
    $role: membership_role!, $token_hash: String!, $expires_at: timestamptz!
  ) {
    insert_invitations_one(object: {
      community_id: $community_id, email: $email,
      role: $role, token_hash: $token_hash, expires_at: $expires_at
    }) { id expires_at }
  }
`;

(async () => {
  const c = await client.request(FIND_COMMUNITY, { slug: community });
  if (!c.communities[0]) throw new Error(`No community with slug=${community}`);

  const token = randomBytes(24).toString('base64url');     // 32 chars
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + ttlDays * 86400_000).toISOString();

  const r = await client.request(INSERT_INVITATION, {
    community_id: c.communities[0].id,
    email,
    role,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  console.log('✅ Invitation created:');
  console.log('  community :', community, '·', c.communities[0].name);
  console.log('  email     :', email);
  console.log('  role      :', role);
  console.log('  expires   :', r.insert_invitations_one.expires_at);
  console.log('');
  console.log('  Send the user this magic link:');
  console.log(`    ${baseUrl}/invite?token=${token}`);
})().catch((e) => {
  console.error('FAILED:', e.message);
  if (e.response?.errors) console.error(JSON.stringify(e.response.errors, null, 2));
  process.exit(1);
});
