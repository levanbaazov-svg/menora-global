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

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: 'select_account' } },
    }),
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
