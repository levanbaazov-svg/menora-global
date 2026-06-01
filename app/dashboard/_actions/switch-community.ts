'use server';

// Switch the active community for a multi-community member.
// Validates membership server-side, sets the cookie, refreshes everything.

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { ACTIVE_COMMUNITY_COOKIE, ACTIVE_COMMUNITY_MAX_AGE } from '@/lib/community/active-cookie';

export async function switchCommunity(communityId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Не авторизован' };

  // Only allow switching to a community the user actually belongs to.
  const allowed = session.hasura.allowed_community_ids ?? [];
  if (!allowed.includes(communityId)) {
    return { ok: false, error: 'Ты не состоишь в этой общине' };
  }

  const store = await cookies();
  store.set(ACTIVE_COMMUNITY_COOKIE, communityId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ACTIVE_COMMUNITY_MAX_AGE,
  });

  // The session callback re-reads the cookie on next request; revalidate the
  // whole dashboard so server components pick up the new active community.
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}
