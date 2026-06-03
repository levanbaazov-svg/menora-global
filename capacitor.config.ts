import type { CapacitorConfig } from '@capacitor/cli';

// Native shell (iOS/Android) for TestFlight / stores. Because the app is SSR
// (server components, server actions, next-auth), the native app loads the LIVE
// deployed site in a WebView rather than a static export — so it's always in
// sync with what's on the web. Point `server.url` at your production deploy.
const config: CapacitorConfig = {
  appId: 'com.menorahglobal.app',
  appName: 'Menorah',
  webDir: 'public',
  server: {
    url: process.env.CAP_SERVER_URL || 'https://menorah-global.vercel.app',
    cleartext: false,
  },
  ios: { contentInset: 'always' },
  // Google sign-in (@capawesome/capacitor-google-sign-in) is configured at
  // runtime via GoogleSignIn.initialize({ clientId }) and, on iOS, via the
  // GIDClientID + URL-scheme entries in Info.plist — no capacitor.config block.
};

export default config;
