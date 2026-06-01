// Card variant for an inspiration item. Used in feeds and grids.

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { InspirationItem } from '@/lib/inspiration/library';
import { KIND_LABELS } from '@/lib/inspiration/library';

export async function InspirationCard({
  item, variant = 'default',
}: {
  item: InspirationItem;
  variant?: 'default' | 'compact' | 'hero';
}) {
  const t = await getTranslations('engageMisc');
  const meta = KIND_LABELS[item.kind];

  if (variant === 'hero') {
    return (
      <Link
        href={`/dashboard/inspire/${item.slug}`}
        className="group block rounded-3xl overflow-hidden relative hover:scale-[1.005] transition-transform"
      >
        <div className={`bg-gradient-to-br ${item.gradient} p-7 md:p-10 min-h-64 flex flex-col justify-end text-white`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute top-5 left-5 z-10 flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest bg-white/90 text-(--color-deep) px-2.5 py-1 rounded-full font-medium">
              {meta.emoji} {meta.ru}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-white font-medium">
              {t('inspire.minutes', { count: item.readingTimeMinutes })}
            </span>
          </div>
          <div className="absolute top-5 right-5 text-3xl drop-shadow-lg">{item.emoji}</div>
          <div className="relative">
            <h3 className="font-serif text-2xl md:text-3xl font-semibold leading-tight drop-shadow-md mb-2">
              {item.title}
            </h3>
            {item.subtitle && (
              <p className="text-sm md:text-base opacity-95 mb-3">{item.subtitle}</p>
            )}
            <p className="text-sm opacity-90 max-w-xl leading-relaxed">{item.teaser}</p>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        href={`/dashboard/inspire/${item.slug}`}
        className="group flex items-center gap-3 p-3 rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 hover:border-(--color-gold)/40 hover:shadow-[var(--shadow-sm)] transition-all"
      >
        <div
          className={`shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-2xl shadow-sm`}
        >
          {item.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-(--color-fg-muted)">
            {meta.ru} · {t('inspire.minutes', { count: item.readingTimeMinutes })}
          </div>
          <div className="font-medium text-sm leading-tight line-clamp-2 mt-0.5">
            {item.title}
          </div>
        </div>
        <span className="shrink-0 text-(--color-fg-muted) group-hover:text-(--color-deep) transition-colors">→</span>
      </Link>
    );
  }

  // default
  return (
    <Link
      href={`/dashboard/inspire/${item.slug}`}
      className="group block rounded-2xl overflow-hidden bg-(--color-bg-elevated) border border-(--color-border)/60 hover:border-(--color-gold)/40 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all"
    >
      <div className={`relative h-32 bg-gradient-to-br ${item.gradient} flex items-end p-4`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 text-[10px] uppercase tracking-wider bg-white/85 text-(--color-deep) px-2 py-0.5 rounded-full font-medium">
          {meta.emoji} {meta.ru}
        </div>
        <div className="absolute top-2 right-2 text-2xl drop-shadow-md">{item.emoji}</div>
        <div className="absolute bottom-2 right-2 text-[10px] bg-black/40 text-white px-2 py-0.5 rounded-full font-medium">
          {t('inspire.minutes', { count: item.readingTimeMinutes })}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-serif text-base font-semibold leading-snug line-clamp-2 group-hover:text-(--color-deep)">
          {item.title}
        </h3>
        {item.subtitle && (
          <p className="text-xs text-(--color-fg-muted) mt-1 line-clamp-1">{item.subtitle}</p>
        )}
        <p className="text-xs text-(--color-fg-muted) mt-2 line-clamp-2">{item.teaser}</p>
      </div>
    </Link>
  );
}
