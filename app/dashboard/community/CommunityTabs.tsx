'use client';

// Sticky tab nav for the community page (Инфо / Гид / Контакты).
// Uses URL ?tab= so the server page renders the right content.

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const TABS = [
  { key: 'info', label: 'Инфо' },
  { key: 'guide', label: 'Гид' },
  { key: 'contacts', label: 'Контакты' },
] as const;

export function CommunityTabs() {
  const sp = useSearchParams();
  const active = sp.get('tab') ?? 'info';
  return (
    <div className="flex gap-1 rounded-full bg-muted p-1">
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <Link
            key={t.key}
            href={t.key === 'info' ? '/dashboard/community' : `/dashboard/community?tab=${t.key}`}
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
