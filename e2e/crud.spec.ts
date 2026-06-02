import { test, expect } from '@playwright/test';
import { cleanupE2EArtifacts } from './seed';

// Deep flows: drive the real forms + server actions end-to-end, assert the
// result page, then remove the created rows so the DB stays clean.
test.afterAll(async () => { await cleanupE2EArtifacts(); });

const stamp = () => Date.now().toString(36);

test('rabbi creates a program → lands on its detail page', async ({ page }) => {
  const name = `E2E Program ${stamp()}`;
  await page.goto('/dashboard/community/programs/new');

  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="schedule_text"]').fill('Every Sunday 10:00');
  await page.locator('form button[type="submit"]').click();

  await page.waitForURL(/\/dashboard\/community\/programs\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await expect(page.getByText(name)).toBeVisible();
});

test('platform admin creates a community (moderated) → redirected to it', async ({ page }) => {
  const name = `E2E New ${stamp()}`;
  await page.goto('/dashboard/community/new');

  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="city"]').fill('Dubai');
  await page.locator('input[name="country_code"]').fill('AE');
  await page.locator('input[name="timezone"]').fill('Asia/Dubai');
  await page.locator('form button[type="submit"]').click();

  // platform admin → live community; redirect to its profile page
  await page.waitForURL(/\/dashboard\/community\/c\/[a-z0-9-]+/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name }).first()).toBeVisible();
});

test('rabbi creates an event → detail page renders', async ({ page }) => {
  const title = `E2E Event ${stamp()}`;
  await page.goto('/dashboard/events/new');

  await page.locator('input[name="title"]').fill(title);
  await page.locator('input[name="starts_at"]').fill('2026-12-01T18:00');
  await page.locator('input[name="location_text"]').fill('Main hall');
  await page.locator('form button[type="submit"]').click();

  await page.waitForURL(/\/dashboard\/events\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await expect(page.getByText(title)).toBeVisible(); // detail renders (no 500)
});

test('rabbi creates a place → detail → edit', async ({ page }) => {
  const name = `E2E Place ${stamp()}`;
  await page.goto('/dashboard/community/places/new');

  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="address"]').fill('1 Test St');
  await page.locator('input[name="city"]').fill('Testopolis');
  await page.locator('form button[type="submit"]').click();

  await page.waitForURL(/\/dashboard\/community\/places\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await expect(page.getByText(name)).toBeVisible();

  const id = page.url().match(/places\/([0-9a-f-]{36})/)![1];
  await page.goto(`/dashboard/community/places/${id}/edit`);
  await expect(page.locator('input[name="name"]')).toHaveValue(name);
});

test('member edit guard: program edit page reachable for rabbi', async ({ page }) => {
  // create one, open its edit page, change the name, save
  const name = `E2E Program ${stamp()}`;
  await page.goto('/dashboard/community/programs/new');
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="schedule_text"]').fill('Weekly');
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/dashboard\/community\/programs\/[0-9a-f-]{36}/, { timeout: 20_000 });

  const id = page.url().match(/programs\/([0-9a-f-]{36})/)![1];
  await page.goto(`/dashboard/community/programs/${id}/edit`);
  await expect(page.locator('input[name="name"]')).toHaveValue(name);
  const renamed = `E2E Program renamed ${stamp()}`;
  await page.locator('input[name="name"]').fill(renamed);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/dashboard\/community\/programs\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await expect(page.getByText(renamed)).toBeVisible();
});
