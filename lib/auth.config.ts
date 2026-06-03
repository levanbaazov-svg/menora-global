// Edge-safe NextAuth v5 config. Used by both middleware (Edge runtime)
// and the full auth.ts (Node runtime). No imports that need node:crypto.
//
// The jwt callback here is a no-op pass-through; the real one in auth.ts
// overrides it. The session callback is shared — it just exposes JWT-encoded
// data to the client without doing any crypto.

import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

// E2E test login — ONLY exists when E2E_TEST_SECRET is set (never in prod).
// Edge-safe: authorize() does no DB work; the real user id is resolved by email
// in the Node jwt callback (auth.ts). Lets Playwright sign in without Google.
const e2eProvider = process.env.E2E_TEST_SECRET
  ? [Credentials({
      id: 'e2e',
      name: 'E2E',
      credentials: { email: {}, secret: {} },
      authorize: (c) =>
        c && c.secret === process.env.E2E_TEST_SECRET && typeof c.email === 'string'
          ? { id: c.email, email: c.email, name: 'E2E' }
          : null,
    })]
  : [];

// Native Google sign-in (Capacitor iOS/Android). The native Google SDK returns
// an ID token; we verify it here (Google tokeninfo) and issue a session. This
// avoids Google's "disallowed_useragent" block on OAuth inside a WebView.
// Edge-safe: only does a fetch; the user is upserted in the Node jwt callback.
const googleNative = Credentials({
  id: 'google-native',
  name: 'Google',
  credentials: { idToken: {} },
  authorize: async (c) => {
    const idToken = typeof c?.idToken === 'string' ? c.idToken : null;
    if (!idToken) return null;
    const res = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
    if (!res.ok) return null;
    const p = await res.json();
    const allowedAud = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID].filter(Boolean);
    const issOk = typeof p.iss === 'string' && /(^|\.)accounts\.google\.com$/.test(p.iss.replace(/^https?:\/\//, ''));
    if (!p.email || !issOk || !allowedAud.includes(p.aud) || p.email_verified === 'false') return null;
    return { id: String(p.sub), email: p.email, name: p.name ?? null, image: p.picture ?? null };
  },
});

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: 'select_account' } },
    }),
    googleNative,
    ...e2eProvider,
  ],
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/' },
  callbacks: {
    // Pass-through; the Node-runtime jwt callback in auth.ts overrides this.
    async jwt({ token }) { return token; },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      if (token.hasura) session.hasura = token.hasura;
      if (token.hasuraToken) session.hasuraToken = token.hasuraToken;
      if (token.onboardingStep) session.onboardingStep = token.onboardingStep;
      if (typeof token.hasMembership === 'boolean') session.hasMembership = token.hasMembership;
      return session;
    },
  },
} satisfies NextAuthConfig;
