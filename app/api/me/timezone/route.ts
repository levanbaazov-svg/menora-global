// POST /api/me/timezone { tz }
// Persists the user's detected browser timezone in an HttpOnly cookie that
// HebrewCalendarCard reads server-side. Lasts 1 year — overridden on each
// detection if the browser reports a different tz.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

const Body = z.object({
  tz: z.string().min(1).max(100),
});

export const COOKIE_NAME = 'menorah-tz';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: parsed.data.tz,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true, tz: parsed.data.tz });
}
