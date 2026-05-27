'use client';

// JewGo-style horizontal scroll category nav for community detail page.
// Active tab is reflected via URL search param `?cat=<place_type|programs|events|people>`.

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PLACE_TYPES, PLACE_TYPE_LABELS, type PlaceType } from '@/lib/places/schema';

interface Tab {
  key: string;
  emoji: string;
  label: string;
  count?: number;
}

interface Props {
  counts: Partial<Record<PlaceType | 'programs' | 'events' | 'people', number>>;
}

export function CategoryNav({ counts }: Props) {
  const params = useSearchParams();
  const active = params.get('cat') ?? 'synagogue';

  const placeTabs: Tab[] = PLACE_TYPES.map((t) => ({
    key: t,
    emoji: PLACE_TYPE_LABELS[t].emoji,
    label: PLACE_TYPE_LABELS[t].ru,
    count: counts[t],
  })).filter((t) => (t.count ?? 0) >= 0);

  const extraTabs: Tab[] = [
    { key: 'programs', emoji: '📖', label: 'Программы', count: counts.programs },
    { key: 'events',   emoji: '📅', label: 'События',   count: counts.events },
    { key: 'people',   emoji: '👥', label: 'Участники', count: counts.people },
  ];

  const tabs = [...placeTabs, ...extraTabs];

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
