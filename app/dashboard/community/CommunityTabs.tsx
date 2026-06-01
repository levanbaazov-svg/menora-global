'use client';

// Sticky tab nav for community pages (Инфо / Гид / Контакты).
// Works for both the member page (/dashboard/community) and the visitor page
// (/dashboard/community/c/[slug]) — pass `basePath` for the latter.

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

const TABS = ['info', 'guide', 'contacts'] as const;

export function CommunityTabs({ basePath = '/dashboard/community' }: { basePath?: string }) {
  const sp = useSearchParams();
  const active = sp.get('tab') ?? 'info';
  const t = useTranslations('community.tabs');
  return (
    <div className="flex gap-1 rounded-full bg-muted p-1">
      {TABS.map((key) => {
        const isActive = active === key;
        const href = key === 'info' ? basePath : `${basePath}?tab=${key}`;
        return (
          <Link
            key={key}
            href={href}
            scroll={false}
            className={`flex-1 text-center rounded-full py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-card text-foreground shadow-[var(--shadow-sm)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(key)}
          </Link>
        );
      })}
    </div>
  );
}
