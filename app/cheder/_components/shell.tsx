'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Ticket, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MelamedGuide } from './melamed';
import { useCheder } from './state';

export function ChederShell({ children }: { children: React.ReactNode }) {
  const { child, tickets, ready } = useCheder();
  const pathname = usePathname();
  const onLanding = pathname === '/cheder';

  return (
    <div className="cheder-theme min-h-dvh bg-background text-foreground">
      {!onLanding && ready && child && (
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
            <Link href="/cheder/today" className="flex min-w-0 items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <GraduationCap className="size-4.5" />
              </span>
              <span className="truncate font-serif text-lg font-semibold tracking-tight">
                Online <span style={{ color: 'var(--ch-blue)' }}>Cheder</span>
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
                className="flex h-9 items-center gap-1.5 rounded-xl border px-3 font-bold"
                style={{
                  backgroundColor: 'var(--ch-amber-soft)',
                  borderColor: 'color-mix(in oklch, var(--ch-amber) 35%, transparent)',
                  color: 'var(--ch-amber)',
                }}
              >
                <Ticket className="size-4.5" />
                <span className="tabular-nums">{tickets}</span>
              </Link>
              <span
                className="flex size-9 items-center justify-center rounded-full text-sm font-bold uppercase"
                style={{ backgroundColor: 'var(--ch-blue-soft)', color: 'var(--ch-blue)' }}
              >
                {child.name.slice(0, 1)}
              </span>
            </div>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-3xl px-4 pb-36">{children}</main>
      {ready && <MelamedGuide />}
    </div>
  );
}
