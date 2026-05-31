'use client';

// Sticky tab nav for community pages (Инфо / Гид / Контакты).
// Works for both the member page (/dashboard/community) and the visitor page
// (/dashboard/community/c/[slug]) — pass `basePath` for the latter.

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const TABS = [
  { key: 'info', label: 'Инфо' },
  { key: 'guide', label: 'Гид' },
  { key: 'contacts', label: 'Контакты' },
] as const;

export function CommunityTabs({ basePath = '/dashboard/community' }: { basePath?: string }) {
  const sp = useSearchParams();
  const active = sp.get('tab') ?? 'info';
  return (
    <div className="flex gap-1 rounded-full bg-muted p-1">
      {TABS.map((t) => {
        const isActive = active === t.key;
        const href = t.key === 'info' ? basePath : `${basePath}?tab=${t.key}`;
        return (
          <Link
            key={t.key}
            href={href}
            scroll={false}
            className={`flex-1 text-center rounded-full py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-card text-foreground shadow-[var(--shadow-sm)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
