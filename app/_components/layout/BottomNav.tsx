'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Tab {
  href: string;
  label: string;
  icon: string;
  matchPrefix: string;
}

const TABS: Tab[] = [
  { href: '/dashboard',           label: 'Главная',  icon: '🏠', matchPrefix: '/dashboard' },
  { href: '/dashboard/community', label: 'Община',  icon: '🕍', matchPrefix: '/dashboard/community' },
  { href: '/dashboard/connect',   label: 'Связь',   icon: '💬', matchPrefix: '/dashboard/connect' },
  { href: '/dashboard/requests',  label: 'Просьбы', icon: '🙋', matchPrefix: '/dashboard/requests' },
  { href: '/dashboard/events',    label: 'События', icon: '📅', matchPrefix: '/dashboard/events' },
];

function isActive(pathname: string, tab: Tab): boolean {
  if (tab.href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(tab.matchPrefix);
}

export function BottomNav() {
  const pathname = usePathname() ?? '/dashboard';

  return (
    <nav
      aria-label="Bottom navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-(--color-border)/60 safe-bottom"
    >
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto">
        {TABS.map((t) => {
          const active = isActive(pathname, t);
          return (
            <Link
              key={t.href}
              href={t.href}
              className="relative flex flex-col items-center justify-center gap-0.5 active:bg-(--color-muted-bg) transition-colors"
            >
              <span
                className={`text-xl leading-none transition-transform ${active ? 'scale-110' : 'opacity-60'}`}
              >
                {t.icon}
              </span>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  active ? 'text-(--color-deep)' : 'text-(--color-fg-muted)'
                }`}
              >
                {t.label}
              </span>
              {active && (
                <span className="absolute top-1 w-1 h-1 rounded-full bg-(--color-gold) spring-in" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
