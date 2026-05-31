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
      <div className="px-3 pb-3 pt-2 flex justify-center">
        <div
          className="
            pointer-events-auto relative
            flex items-center gap-1
            rounded-[28px] px-2 py-1.5
            bg-white/60 dark:bg-black/40
            border border-white/40
            shadow-[0_8px_32px_-4px_rgba(20,24,31,0.18),0_2px_8px_rgba(20,24,31,0.06)]
            backdrop-blur-[24px] backdrop-saturate-[180%]
            ring-1 ring-black/[0.02]
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
                className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[56px] rounded-[20px] group transition-colors"
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-0 rounded-[20px] bg-foreground/[0.06]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span
                  className={`relative z-10 transition-colors duration-200 ${
                    active ? 'text-primary' : 'text-foreground/55 group-hover:text-foreground/80'
                  }`}
                >
                  <Icon
                    strokeWidth={active ? 2.2 : 1.8}
                    className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}
                    size={22}
                  />
                </span>
                <span
                  className={`relative z-10 text-[10px] font-medium leading-none tracking-tight transition-colors ${
                    active ? 'text-foreground' : 'text-foreground/55'
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
