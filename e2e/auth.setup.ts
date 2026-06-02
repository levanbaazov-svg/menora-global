import { test as setup, expect } from '@playwright/test';
import { ensureE2EFixtures, E2E_EMAIL } from './seed';

const authFile = 'e2e/.auth/state.json';

// Seeds the e2e user/community, signs in via the credentials test-bypass, and
// persists the authenticated storage state for the rest of the suite.
setup('authenticate', async ({ page, context }) => {
  await ensureE2EFixtures();

  const { csrfToken } = await (await page.request.get('/api/auth/csrf')).json();
  await page.request.post('/api/auth/callback/e2e', {
    form: {
      csrfToken,
      email: E2E_EMAIL,
      secret: process.env.E2E_TEST_SECRET!,
      callbackUrl: '/dashboard',
      json: 'true',
    },
  });

  const session = await (await page.request.get('/api/auth/session')).json();
  expect(session?.user?.id, 'session should be authenticated').toBeTruthy();

  await context.storageState({ path: authFile });
});
