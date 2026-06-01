'use client';

// JewGo-style horizontal scroll category nav.
//
// Visibility rules:
//   - ALWAYS visible: synagogue, food (restaurant + cafe merged), store,
//     programs, events, people
//   - Conditionally visible: mikvah, school, service, jcc, museum, cemetery —
//     only if at least one entry exists (or user is staff).

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { type Locale } from '@/i18n/config';
import { PLACE_TYPE_LABELS, type PlaceType } from '@/lib/places/schema';

interface Tab {
  key: string;
  emoji: string;
  label: string;
  count?: number;
}

interface Props {
  counts: Partial<Record<PlaceType | 'food' | 'programs' | 'events' | 'people', number>>;
  isStaff: boolean;
}

const CONDITIONAL_PLACES: PlaceType[] = ['mikvah', 'school', 'service', 'jcc', 'museum', 'cemetery'];

export function CategoryNav({ counts, isStaff }: Props) {
  const params = useSearchParams();
  const t = useTranslations('communityMisc');
  const locale = useLocale() as Locale;
  const active = params.get('cat') ?? 'programs';

  const alwaysTabs: Tab[] = [
    { key: 'synagogue', emoji: PLACE_TYPE_LABELS.synagogue.emoji, label: PLACE_TYPE_LABELS.synagogue[locale], count: counts.synagogue },
    { key: 'food',      emoji: '🍽',                              label: t('catFood'),                        count: counts.food },
    { key: 'store',     emoji: PLACE_TYPE_LABELS.store.emoji,     label: PLACE_TYPE_LABELS.store[locale],     count: counts.store },
  ];

  const conditionalTabs: Tab[] = CONDITIONAL_PLACES
    .filter((t) => isStaff || (counts[t] ?? 0) > 0)
    .map((tp) => ({
      key: tp,
      emoji: PLACE_TYPE_LABELS[tp].emoji,
      label: PLACE_TYPE_LABELS[tp][locale],
      count: counts[tp],
    }));

  const extraTabs: Tab[] = [
    { key: 'programs', emoji: '📖', label: t('catPrograms'), count: counts.programs },
    { key: 'events',   emoji: '📅', label: t('catEvents'),   count: counts.events },
    { key: 'people',   emoji: '👥', label: t('catPeople'),   count: counts.people },
  ];

  const tabs = [...alwaysTabs, ...conditionalTabs, ...extraTabs];

  return (
    <div className="sticky top-14 z-20 -mx-5 md:-mx-6 px-5 md:px-6 glass border-b border-(--color-border)/60">
      <div className="scroll-x-snap flex gap-2 overflow-x-auto py-3">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <Link
              key={t.key}
              href={`?cat=${t.key}`}
              scroll={false}
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'bg-(--color-deep) text-white shadow-[var(--shadow-md)]'
                  : 'bg-(--color-bg-elevated) border border-(--color-border)/60 hover:border-(--color-gold)/40'
              }`}
            >
              <span className="text-base">{t.emoji}</span>
              <span>{t.label}</span>
              {typeof t.count === 'number' && t.count > 0 && (
                <span className={`text-xs ${isActive ? 'opacity-70' : 'text-(--color-fg-subtle)'}`}>
                  · {t.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
