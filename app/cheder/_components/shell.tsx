'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Ticket, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCheder } from './state';

export function ChederShell({ children }: { children: React.ReactNode }) {
  const { child, tickets, ready } = useCheder();
  const pathname = usePathname();
  const onLanding = pathname === '/cheder';

  return (
    <div className="min-h-dvh bg-background">
      {!onLanding && ready && child && (
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
            <Link href="/cheder/today" className="flex min-w-0 items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <GraduationCap className="size-4.5" />
              </span>
              <span className="truncate font-serif text-lg font-semibold tracking-tight">
                Online Cheder
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/cheder/progress"
                className={cn(
                  'flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground',
                  pathname === '/cheder/progress' && 'text-foreground',
                )}
                aria-label="My progress"
              >
                <TrendingUp className="size-4.5" />
              </Link>
              <Link
                href="/cheder/store"
                className="flex h-9 items-center gap-1.5 rounded-xl border border-primary/30 bg-accent px-3 font-semibold text-accent-foreground"
              >
                <Ticket className="size-4.5" />
                <span className="tabular-nums">{tickets}</span>
              </Link>
              <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-bold uppercase">
                {child.name.slice(0, 1)}
              </span>
            </div>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-3xl px-4 pb-16">{children}</main>
    </div>
  );
}
