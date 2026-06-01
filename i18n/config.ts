// Shared locale config for next-intl (cookie-based, no URL routing).

export const LOCALES = ['ru', 'en', 'he'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ru';

/** Cookie that stores the active UI language. */
export const LOCALE_COOKIE = 'menorah-locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Text direction per locale. Hebrew is right-to-left. */
export const LOCALE_DIR: Record<Locale, 'ltr' | 'rtl'> = {
  ru: 'ltr',
  en: 'ltr',
  he: 'rtl',
};

/** BCP-47 tags for Intl date/number formatting per locale. */
export const LOCALE_BCP47: Record<Locale, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  he: 'he-IL',
};

/** Human-readable language names (shown in the switcher, in their own script). */
export const LOCALE_LABELS: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  he: 'עברית',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function dirFor(locale: string): 'ltr' | 'rtl' {
  return isLocale(locale) ? LOCALE_DIR[locale] : 'ltr';
}
