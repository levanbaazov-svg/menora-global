// Bottom tab bar — shown only on small screens. Fixed at the bottom of viewport.
// Adds bottom padding so content isn't covered.

import Link from 'next/link';

interface Tab {
  href: string;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { href: '/dashboard',          label: 'Главная',  icon: '🏠' },
  { href: '/dashboard/events',   label: 'События', icon: '📅' },
  { href: '/dashboard/requests', label: 'Просьбы', icon: '🙋' },
  { href: '/dashboard/routines', label: 'Рутины',  icon: '🕯' },
  { href: '/dashboard/me',       label: 'Я',       icon: '👤' },
];

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-16">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="flex flex-col items-center justify-center gap-0.5 text-(--color-muted) hover:text-(--color-deep) active:bg-(--color-muted-bg) transition-colors"
          >
            <span className="text-xl leading-none">{t.icon}</span>
            <span className="text-[10px] font-medium">{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
