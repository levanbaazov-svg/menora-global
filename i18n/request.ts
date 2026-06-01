// next-intl request config (App Router, no i18n routing).
// Resolves the active locale from the cookie, falling back to the default.
// Messages = base messages/<locale>.json deep-merged with any per-namespace
// files in messages/<locale>/*.json (lets translation work be split safely).

import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config';

type Dict = Record<string, unknown>;

function deepMerge(a: Dict, b: Dict): Dict {
  const out: Dict = { ...a };
  for (const k of Object.keys(b)) {
    const av = a[k], bv = b[k];
    if (av && bv && typeof av === 'object' && typeof bv === 'object'
        && !Array.isArray(av) && !Array.isArray(bv)) {
      out[k] = deepMerge(av as Dict, bv as Dict);
    } else {
      out[k] = bv;
    }
  }
  return out;
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  let messages = (await import(`../messages/${locale}.json`)).default as Dict;

  // Merge per-namespace overlay files (messages/<locale>/*.json), if any.
  try {
    const dir = path.join(process.cwd(), 'messages', locale);
    const files = await fs.readdir(dir);
    for (const f of files.sort()) {
      if (!f.endsWith('.json')) continue;
      const part = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8')) as Dict;
      messages = deepMerge(messages, part);
    }
  } catch {
    // no overlay directory for this locale — fine
  }

  return { locale, messages };
});
