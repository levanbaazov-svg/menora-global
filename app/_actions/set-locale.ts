'use server';

// Switch the active UI language: write the cookie (read by i18n/request.ts)
// and best-effort persist to the user's profile so it follows them across devices.

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import {
  LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale, type Locale,
} from '@/i18n/config';

const UPDATE_LOCALE = /* GraphQL */ `
  mutation SetLocale($id: uuid!, $locale: String!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: { locale: $locale }) { id }
  }
`;

export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });

  // Persist to the user record (non-blocking; failure shouldn't break the switch).
  try {
    const session = await auth();
    if (session?.user?.id) {
      await hasuraAdmin.request(UPDATE_LOCALE, { id: session.user.id, locale });
    }
  } catch {
    // ignore — cookie already set
  }

  revalidatePath('/', 'layout');
}
