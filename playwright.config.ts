import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

// E2E suite. Boots the app on :3100 (so it doesn't clash with `next dev` on
// :3100 isn't your :3000) with E2E_TEST_SECRET enabled, signs in via the
// credentials test-bypass, then runs smoke + deep CRUD flows.
const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'e2e',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/state.json' },
    },
  ],
  // Serve an isolated PROD build on :3100 (its own dist dir) so it doesn't
  // clash with `next dev` on :3000 and has E2E_TEST_SECRET enabled.
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 300_000,
    env: {
      ...process.env,
      NEXT_DIST_DIR: '.next-e2e',
      // Pin auth URL to the E2E port so redirects stay on :3100 (otherwise the
      // .env NEXTAUTH_URL=:3000 bounces requests to the dev server).
      NEXTAUTH_URL: `http://localhost:${PORT}`,
      AUTH_URL: `http://localhost:${PORT}`,
      AUTH_TRUST_HOST: 'true',
    } as Record<string, string>,
  },
});
