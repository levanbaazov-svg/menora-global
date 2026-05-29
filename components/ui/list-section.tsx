// iOS-Settings-style sectioned list primitive.
// Composition: ListSection > ListRow / ListRow / ...
// All rows render with a 1px separator between them and rounded outer card.

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface SectionProps {
  /** Tiny ALL-CAPS label above the card (optional). */
  label?: ReactNode;
  /** Right-aligned action / link in the header (optional). */
  action?: ReactNode;
  /** Helper text below the list (iOS-style footnote). */
  footnote?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ListSection({ label, action, footnote, children, className }: SectionProps) {
  return (
    <section className={cn('space-y-2', className)}>
      {(label || action) && (
        <div className="flex items-end justify-between px-1">
          {label && (
            <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
              {label}
            </div>
          )}
          {action && <div className="-mt-1 -mb-1">{action}</div>}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
        <div className="divide-y divide-border/60">{children}</div>
      </div>
      {footnote && (
        <div className="text-[11px] text-muted-foreground px-1 leading-relaxed">
          {footnote}
        </div>
      )}
    </section>
  );
}

interface RowProps {
  /** Lucide icon component (rendered in a neutral square). */
  Icon?: LucideIcon;
  /** Optional emoji to use INSTEAD of the icon (for content/scenarios). */
  emoji?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-side meta — a value, badge, or count. */
  meta?: ReactNode;
  /** When set, row becomes a link with chevron. */
  href?: string;
  /** Tint hint for the icon container — kept subtle */
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** Hide trailing chevron even if href is set */
  noChevron?: boolean;
  className?: string;
}

const TONE_BG: Record<NonNullable<RowProps['tone']>, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/15 text-primary',
  success: 'bg-emerald-500/10 text-emerald-700',
  warning: 'bg-amber-500/15 text-amber-700',
  danger:  'bg-destructive/10 text-destructive',
  info:    'bg-sky-500/10 text-sky-700',
};

export function ListRow({
  Icon, emoji, title, subtitle, meta, href, tone = 'default', noChevron, className,
}: RowProps) {
  const inner = (
    <>
      {(Icon || emoji) && (
        <div className={cn(
          'shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg text-base',
          TONE_BG[tone],
        )}>
          {emoji ? <span>{emoji}</span> : Icon ? <Icon className="h-4 w-4" /> : null}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-snug truncate">{title}</div>
        {subtitle && (
          <div className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">
            {subtitle}
          </div>
        )}
      </div>
      {meta && (
        <div className="shrink-0 text-xs text-muted-foreground font-medium tabular-nums flex items-center gap-1">
          {meta}
        </div>
      )}
      {href && !noChevron && (
        <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
      )}
    </>
  );

  const baseCls = cn(
    'flex items-center gap-3 px-4 py-3 transition-colors',
    href && 'hover:bg-muted/60 active:bg-muted',
    className,
  );

  if (href) {
    return <Link href={href} className={baseCls}>{inner}</Link>;
  }
  return <div className={baseCls}>{inner}</div>;
}
