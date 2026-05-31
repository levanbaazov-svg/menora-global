'use client';

// Liquid Glass bottom tab bar — inspired by iOS 26 design language.
// Floating, frosted, rounded pill. Lucide line icons (no emoji).
// Motion: indicator pill flows between tabs via shared layoutId.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Home, Building2, MessageCircle, HandHeart, CalendarDays } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Tab {
  href: string;
  label: string;
  Icon: LucideIcon;
  matchPrefix: string;
}

const TABS: Tab[] = [
  { href: '/dashboard',           label: 'Главная',  Icon: Home,          matchPrefix: '/dashboard' },
  { href: '/dashboard/community', label: 'Община',   Icon: Building2,     matchPrefix: '/dashboard/community' },
  { href: '/dashboard/connect',   label: 'Связь',    Icon: MessageCircle, matchPrefix: '/dashboard/connect' },
  { href: '/dashboard/requests',  label: 'Просьбы',  Icon: HandHeart,     matchPrefix: '/dashboard/requests' },
  { href: '/dashboard/events',    label: 'События',  Icon: CalendarDays,  matchPrefix: '/dashboard/events' },
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
      className="fixed inset-x-0 bottom-0 z-40 pointer-events-none safe-bottom"
    >
      {/* Wrap with extra bottom padding so the floating pill sits above the home indicator */}
      <div className="px-4 pb-2.5 pt-2 flex justify-center">
        <div
          className="
            pointer-events-auto relative
            flex items-center gap-0.5
            rounded-full px-1.5 py-1.5
            bg-white/65 dark:bg-black/45
            border border-white/50
            shadow-[0_6px_24px_-6px_rgba(20,24,31,0.16),0_1px_4px_rgba(20,24,31,0.05)]
            backdrop-blur-[28px] backdrop-saturate-[180%]
          "
        >
          {TABS.map((t) => {
            const active = isActive(pathname, t);
            const Icon = t.Icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? 'page' : undefined}
                aria-label={t.label}
                className="relative flex flex-col items-center justify-center gap-0.5 px-3.5 py-1.5 rounded-full group transition-colors"
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
                    size={21}
                  />
                </span>
                <span
                  className={`relative z-10 text-[9px] font-medium leading-none tracking-tight transition-colors ${
                    active ? 'text-primary' : 'text-foreground/50'
                  }`}
                >
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
