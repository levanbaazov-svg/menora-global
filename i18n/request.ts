// next-intl request config (App Router, no i18n routing).
// Resolves the active locale from the cookie, falling back to the default.

import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config';

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  const messages = (await import(`../messages/${locale}.json`)).default;

  return { locale, messages };
});
