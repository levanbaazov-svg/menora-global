// Auth gate only. Onboarding routing is enforced inside dashboard/onboarding
// layouts (DB-fresh checks) — keeping middleware JWT-only avoids staleness.

import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Static & API routes pass through.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/invite/')
  ) {
    return NextResponse.next();
  }

  const session = req.auth;
  const protectedPath =
    pathname === '/dashboard' || pathname.startsWith('/dashboard/') ||
    pathname.startsWith('/onboarding');

  if (!session?.user && protectedPath) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
