'use client';

// Liquid Glass bottom tab bar — inspired by iOS 26 design language.
// Floating, frosted, rounded pill. Lucide line icons (no emoji).
// Motion: indicator pill flows between tabs via shared layoutId.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import { Home, Building2, MessageCircle, HandHeart, CalendarDays } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Tab {
  href: string;
  labelKey: string;
  Icon: LucideIcon;
  matchPrefix: string;
}

const TABS: Tab[] = [
  { href: '/dashboard',           labelKey: 'home',      Icon: Home,          matchPrefix: '/dashboard' },
  { href: '/dashboard/community', labelKey: 'community', Icon: Building2,     matchPrefix: '/dashboard/community' },
  { href: '/dashboard/connect',   labelKey: 'connect',   Icon: MessageCircle, matchPrefix: '/dashboard/connect' },
  { href: '/dashboard/requests',  labelKey: 'requests',  Icon: HandHeart,     matchPrefix: '/dashboard/requests' },
  { href: '/dashboard/events',    labelKey: 'events',    Icon: CalendarDays,  matchPrefix: '/dashboard/events' },
];

function isActive(pathname: string, tab: Tab): boolean {
  if (tab.href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(tab.matchPrefix);
}

export function BottomNav() {
  const pathname = usePathname() ?? '/dashboard';
  const t = useTranslations('nav');

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 pointer-events-none safe-bottom"
    >
      {/* Sits just above the home indicator; pill stretches a bit wider */}
      <div className="px-2.5 pb-1 pt-2 flex justify-center">
        <div
          className="
            pointer-events-auto relative
            flex items-center justify-between gap-1 w-full max-w-md
            rounded-full px-2 py-1.5
            bg-white/65 dark:bg-black/45
            border border-white/50
            shadow-[0_6px_24px_-6px_rgba(20,24,31,0.16),0_1px_4px_rgba(20,24,31,0.05)]
            backdrop-blur-[28px] backdrop-saturate-[180%]
          "
        >
          {TABS.map((tab) => {
            const active = isActive(pathname, tab);
            const Icon = tab.Icon;
            const label = t(tab.labelKey);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-full group transition-colors"
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-0 rounded-full bg-primary/12"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span
                  className={`relative z-10 transition-colors duration-200 ${
                    active ? 'text-primary' : 'text-foreground/50 group-hover:text-foreground/75'
                  }`}
                >
                  <Icon
                    strokeWidth={active ? 2.3 : 1.9}
                    className={`transition-transform duration-200 ${active ? 'scale-105' : ''}`}
                    size={23}
                  />
                </span>
                <span
                  className={`relative z-10 text-[10px] font-medium leading-none tracking-tight transition-colors ${
                    active ? 'text-primary' : 'text-foreground/50'
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
