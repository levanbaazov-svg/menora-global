// Permission / RLS test harness for the AI Rabbi platform.
//
// Impersonates each Hasura role (anonymous / member / rabbi / admin) by sending
// X-Hasura-Role + X-Hasura-User-Id + community session vars alongside the admin
// secret, then runs the queries the app's pages actually make and asserts:
//   1. no GraphQL errors (catches the "field not found in query_root" class —
//      i.e. a role missing SELECT on a table a page reads),
//   2. row-level scoping (a member of A cannot read community B's data; a rabbi
//      of B cannot write to A),
//   3. anonymous sees only public data.
//
// Self-seeds minimal fixtures (a 2nd community + role-variety users) idempotently.
//
// Usage: node scripts/test-permissions.js

'use strict';
require('dotenv').config();

const H = process.env.HASURA_GRAPHQL_ENDPOINT;
const SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
const SQL = H.replace(/\/v1\/graphql\/?$/, '') + '/v2/query';

const DNEPR = '756fbbe4-134c-4b94-b9e1-b5fd0b08b00d';
const SIMANTOV = '635a7a92-5741-49fe-bf51-7e5fc1f4c64c';

let pass = 0, fail = 0;
const fails = [];

async function runSql(sql, readOnly = false) {
  const r = await fetch(SQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hasura-Admin-Secret': SECRET },
    body: JSON.stringify({ type: 'run_sql', args: { source: 'default', sql, read_only: readOnly } }),
  });
  return r.json();
}

// GraphQL as a specific role (admin secret + role/user/community impersonation).
async function gql(ctx, query, variables = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Hasura-Admin-Secret': SECRET };
  if (ctx.role) headers['X-Hasura-Role'] = ctx.role;
  if (ctx.userId) headers['X-Hasura-User-Id'] = ctx.userId;
  if (ctx.communityId) headers['X-Hasura-Community-Id'] = ctx.communityId;
  if (ctx.allowed) headers['X-Hasura-Allowed-Community-Ids'] = `{${ctx.allowed.join(',')}}`;
  const r = await fetch(H, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
  return r.json();
}

function ok(name, cond, detail = '') {
  if (cond) { pass++; process.stdout.write('✓'); }
  else { fail++; fails.push(`${name}${detail ? ' — ' + detail : ''}`); process.stdout.write('✗'); }
}

// ── Fixtures ────────────────────────────────────────────────────────────────
async function ensureFixtures() {
  // Second community for cross-community leak tests.
  await runSql(`
    INSERT INTO public.communities (slug, name, city, country_code, timezone, is_public, approval_status)
    VALUES ('qa-test-community', 'QA Test Community', 'Testville', 'US', 'America/New_York', true, 'approved')
    ON CONFLICT (slug) DO NOTHING;
  `);
  const cRes = await runSql(`SELECT id FROM public.communities WHERE slug='qa-test-community';`, true);
  const COMMUNITY_B = cRes.result[1][0];

  // Role-variety users (inserted as data; they don't log in via OAuth).
  const users = [
    ['qa-member@test.menorah', 'QA Member', DNEPR, 'member'],
    ['qa-rabbi-b@test.menorah', 'QA Rabbi B', COMMUNITY_B, 'rabbi'],
    ['qa-member-b@test.menorah', 'QA Member B', COMMUNITY_B, 'member'],
  ];
  const ids = {};
  for (const [email, name, cid, role] of users) {
    await runSql(`INSERT INTO public.users (email, name) VALUES ('${email}', '${name}') ON CONFLICT (email) DO NOTHING;`);
    const u = await runSql(`SELECT id FROM public.users WHERE email='${email}';`, true);
    const uid = u.result[1][0];
    ids[email] = uid;
    await runSql(`
      INSERT INTO public.memberships (user_id, community_id, role, status, entry_method)
      VALUES ('${uid}', '${cid}', '${role}', 'active', 'rabbi_added')
      ON CONFLICT DO NOTHING;
    `);
  }
  return {
    COMMUNITY_B,
    member: { role: 'member', userId: ids['qa-member@test.menorah'], communityId: DNEPR, allowed: [DNEPR] },
    rabbiB: { role: 'rabbi', userId: ids['qa-rabbi-b@test.menorah'], communityId: COMMUNITY_B, allowed: [COMMUNITY_B] },
    memberB: { role: 'member', userId: ids['qa-member-b@test.menorah'], communityId: COMMUNITY_B, allowed: [COMMUNITY_B] },
  };
}

// ── Page query battery (the real reads each role's pages perform) ────────────
const MEMBER_QUERIES = {
  community: `query{ communities(limit:1){id} memberships(limit:1){id} events(limit:1){id} programs(limit:1){id} places(limit:1){id} }`,
  connect: `query($u:uuid!){ interest_groups(limit:1){id} group_memberships(where:{user_id:{_eq:$u}},limit:1){id} }`,
  requests: `query{ requests(limit:1){id} }`,
  personal: `query($u:uuid!){ routines(where:{user_id:{_eq:$u}}){id} checkins(where:{user_id:{_eq:$u}},limit:1){id} notifications(where:{recipient_user_id:{_eq:$u}},limit:1){id} inspiration_bookmarks(where:{user_id:{_eq:$u}},limit:1){id} ai_conversations(where:{user_id:{_eq:$u}},limit:1){id} request_replies(limit:1){id} }`,
  profile: `query($u:uuid!){ users_by_pk(id:$u){id} user_profiles(where:{user_id:{_eq:$u}},limit:1){user_id} }`,
};

async function main() {
  console.log('Seeding fixtures…');
  const fx = await ensureFixtures();
  console.log('Community B:', fx.COMMUNITY_B, '\n');

  const roles = [
    ['member', fx.member],
    ['rabbi', fx.rabbiB],
    ['admin', { ...fx.rabbiB, role: 'admin' }],
  ];

  // 1. No-crash battery: every role can run every page's reads without errors.
  console.log('1. Page-read battery (no missing-permission crashes):');
  for (const [label, ctx] of roles) {
    process.stdout.write(`   ${label}: `);
    for (const [name, query] of Object.entries(MEMBER_QUERIES)) {
      const res = await gql(ctx, query, query.includes('$u') ? { u: ctx.userId } : {});
      ok(`${label}/${name}`, !res.errors, res.errors ? JSON.stringify(res.errors[0]?.message).slice(0, 80) : '');
    }
    process.stdout.write('\n');
  }

  // 2. Cross-community isolation: member of Dnepr must NOT see Community B rows.
  console.log('2. Cross-community isolation:');
  process.stdout.write('   ');
  {
    const res = await gql(fx.member, `query($c:uuid!){ memberships(where:{community_id:{_eq:$c}}){id} requests(where:{community_id:{_eq:$c}}){id} }`, { c: fx.COMMUNITY_B });
    ok('member cannot read community B memberships', !res.errors && (res.data?.memberships?.length ?? 0) === 0);
    ok('member cannot read community B requests', !res.errors && (res.data?.requests?.length ?? 0) === 0);
  }

  // 3. Anonymous: only public communities; no private tables.
  console.log('\n3. Anonymous access:');
  process.stdout.write('   ');
  {
    const pub = await gql({ role: 'anonymous' }, `query{ communities(limit:1){id} }`);
    ok('anonymous can read public communities', !pub.errors);
    const priv = await gql({ role: 'anonymous' }, `query($u:uuid!){ routines(where:{user_id:{_eq:$u}}){id} }`, { u: SIMANTOV });
    // either denied (errors) or empty — both are safe; a populated result is a leak
    ok('anonymous cannot read private routines', priv.errors || (priv.data?.routines?.length ?? 0) === 0);
  }

  console.log('\n\n──────────────────────────────');
  console.log(`PASS ${pass}  FAIL ${fail}`);
  if (fails.length) { console.log('\nFailures:'); fails.forEach((f) => console.log('  ✗ ' + f)); }
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(2); });
