'use client';

// Three-way RU / EN / HE language toggle. Writes the cookie via a server action
// and refreshes so server components re-render in the new locale.

import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/config';
import { setLocale } from '@/app/_actions/set-locale';

export function LanguageSwitcher() {
  const active = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(loc: Locale) {
    if (loc === active || pending) return;
    startTransition(async () => {
      await setLocale(loc);
      router.refresh();
    });
  }

  return (
    <div className="px-1">
      <div className="flex items-center gap-1.5 mb-2 text-xs uppercase tracking-wider text-(--color-fg-muted)">
        <Languages size={13} strokeWidth={2} />
        <span>Язык / Language / שפה</span>
      </div>
      <div
        className="flex gap-1 rounded-full bg-(--color-bg-muted) p-1"
        role="group"
        aria-label="Language"
      >
        {LOCALES.map((loc) => {
          const isActive = loc === active;
          return (
            <button
              key={loc}
              type="button"
              onClick={() => choose(loc)}
              disabled={pending}
              aria-pressed={isActive}
              className={`flex-1 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                isActive
                  ? 'bg-(--color-bg-elevated) text-(--color-fg) shadow-sm'
                  : 'text-(--color-fg-muted) hover:text-(--color-fg)'
              }`}
            >
              {LOCALE_LABELS[loc]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
