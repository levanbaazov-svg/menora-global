// E2E fixtures: a dedicated test user + isolated community (kept out of the
// real Discover feed). All test artifacts live in this community and are
// cleaned up after the run, so production/demo data is never touched.

import 'dotenv/config';

const H = process.env.HASURA_GRAPHQL_ENDPOINT!;
const SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET!;
const SQL = H.replace(/\/v1\/graphql\/?$/, '') + '/v2/query';

export const E2E_EMAIL = 'e2e@menorah.test';
export const E2E_SLUG = 'e2e-playground';

export async function runSql(sql: string, readOnly = false) {
  const r = await fetch(SQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hasura-Admin-Secret': SECRET },
    body: JSON.stringify({ type: 'run_sql', args: { source: 'default', sql, read_only: readOnly } }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`run_sql: ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

const cell = (res: { result?: string[][] }) => res.result?.[1]?.[0];

/** Idempotently create the e2e user (onboarded, platform admin) + an isolated,
 *  hidden community where they're rabbi. Returns ids. */
export async function ensureE2EFixtures() {
  await runSql(`
    INSERT INTO public.communities (slug, name, city, country_code, timezone, is_public, approval_status, description)
    VALUES ('${E2E_SLUG}', 'E2E Playground', 'Testopolis', 'US', 'America/New_York', false, 'approved', 'Automated test community')
    ON CONFLICT (slug) DO NOTHING;
  `);
  const communityId = cell(await runSql(`SELECT id FROM public.communities WHERE slug='${E2E_SLUG}';`, true))!;

  await runSql(`
    INSERT INTO public.users (email, name, onboarding_step, onboarded_at, tutorial_completed, is_platform_admin, locale)
    VALUES ('${E2E_EMAIL}', 'E2E Tester', 'done', now(), true, true, 'en')
    ON CONFLICT (email) DO UPDATE SET onboarding_step='done', onboarded_at=now(), is_platform_admin=true;
  `);
  const userId = cell(await runSql(`SELECT id FROM public.users WHERE email='${E2E_EMAIL}';`, true))!;

  await runSql(`
    INSERT INTO public.memberships (user_id, community_id, role, status, entry_method)
    VALUES ('${userId}', '${communityId}', 'rabbi', 'active', 'rabbi_added')
    ON CONFLICT DO NOTHING;
  `);

  return { userId, communityId };
}

/** Remove everything the tests created in the e2e community (by E2E_ name marker). */
export async function cleanupE2EArtifacts() {
  const communityId = cell(await runSql(`SELECT id FROM public.communities WHERE slug='${E2E_SLUG}';`, true));
  if (!communityId) return;
  await runSql(`DELETE FROM public.rsvps WHERE event_id IN (SELECT id FROM public.events WHERE community_id='${communityId}' AND title LIKE 'E2E %');`);
  await runSql(`DELETE FROM public.events   WHERE community_id='${communityId}' AND title LIKE 'E2E %';`);
  await runSql(`DELETE FROM public.programs WHERE community_id='${communityId}' AND name  LIKE 'E2E %';`);
  await runSql(`DELETE FROM public.places   WHERE community_id='${communityId}' AND name  LIKE 'E2E %';`);
  // communities created by the create-community test (marker in name)
  await runSql(`DELETE FROM public.memberships WHERE community_id IN (SELECT id FROM public.communities WHERE name LIKE 'E2E New %');`);
  await runSql(`DELETE FROM public.communities WHERE name LIKE 'E2E New %';`);
}
