import type { CapacitorConfig } from '@capacitor/cli';

// Native shell (iOS/Android) for TestFlight / stores. Because the app is SSR
// (server components, server actions, next-auth), the native app loads the LIVE
// deployed site in a WebView rather than a static export — so it's always in
// sync with what's on the web. Point `server.url` at your production deploy.
const config: CapacitorConfig = {
  appId: 'com.menorahglobal.community',
  appName: 'Menorah',
  webDir: 'public',
  server: {
    url: process.env.CAP_SERVER_URL || 'https://menorah-global.vercel.app',
    cleartext: false,
  },
  // contentInset 'never' lets the web app own the safe areas via CSS
  // env(safe-area-inset-*) (the header/nav already pad for them). 'always' would
  // double-inset and leave an empty strip under the status bar + above the home
  // indicator.
  ios: { contentInset: 'never' },
  // Google sign-in (@capawesome/capacitor-google-sign-in) is configured at
  // runtime via GoogleSignIn.initialize({ clientId }) and, on iOS, via the
  // GIDClientID + URL-scheme entries in Info.plist — no capacitor.config block.
};

export default config;
