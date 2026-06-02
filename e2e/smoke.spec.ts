import { test, expect } from '@playwright/test';

// Navigation smoke: every key route loads without a runtime/console error and
// renders content. Runs authenticated as the e2e rabbi + platform admin.
const ROUTES = [
  '/dashboard',
  '/dashboard/community',
  '/dashboard/connect',
  '/dashboard/requests',
  '/dashboard/events',
  '/dashboard/ai-rabbi',
  '/dashboard/admin',
  '/dashboard/admin/communities',
  '/dashboard/me',
  '/dashboard/notifications',
  '/dashboard/community/discover',
  '/dashboard/community/new',
  '/dashboard/community/programs/new',
  '/dashboard/events/new',
];

for (const route of ROUTES) {
  test(`loads ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    const resp = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(resp?.status(), `HTTP status for ${route}`).toBeLessThan(400);

    // Next.js dev runtime error overlay must not appear.
    await expect(page.locator('text=Unhandled Runtime Error')).toHaveCount(0);
    // Page rendered an <h1> (every screen has one).
    await expect(page.locator('h1').first()).toBeVisible();

    expect(errors, `uncaught JS errors on ${route}`).toEqual([]);
  });
}
