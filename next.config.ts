import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow an isolated build dir (E2E suite serves prod on :3100 without
  // clobbering the dev server's .next). Defaults to .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    // Keep RSC payloads in the client router cache so flipping back to a tab
    // you just visited is instant instead of a fresh ~700ms server+Hasura
    // round-trip. Short window so data still stays reasonably fresh.
    staleTimes: { dynamic: 45, static: 300 },
  },
};

export default withNextIntl(config);
