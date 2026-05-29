'use client';

// Mobile-only bottom tab bar. Mirrors PRIMARY_NAV.
// Hidden on md+ where the sidebar takes over.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { PRIMARY_NAV, isActive } from './nav-config';

export function AppBottomNav() {
  const pathname = usePathname() ?? '/dashboard';

  return (
    <nav
      aria-label="Bottom navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border/50 safe-bottom"
    >
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto">
        {PRIMARY_NAV.map((t) => {
          const active = isActive(pathname, t);
          return (
            <Link
              key={t.href}
              href={t.href}
              className="relative flex flex-col items-center justify-center gap-1 group active:scale-95 transition-transform"
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-pill"
                  className="absolute inset-x-3 inset-y-1.5 rounded-2xl bg-primary/10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <t.Icon
                className={`relative h-5 w-5 transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
              <span
                className={`relative text-[10px] font-medium transition-colors ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
