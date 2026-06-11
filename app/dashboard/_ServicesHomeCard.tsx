// Быстрый доступ к сервисам общины с главной: одна строка-кнопка
// «Сервисы общины» → секция #services на странице общины.

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Package } from 'lucide-react';
import { getServicesForCommunity } from '@/lib/services/catalog';

export async function ServicesHomeCard() {
  const t = await getTranslations('home');
  // До своей БД каталог одинаков для всех общин (см. lib/services/catalog.ts)
  const services = getServicesForCommunity('');
  if (services.length === 0) return null;

  // Подпись — первые три сервиса через точку
  const preview = services.slice(0, 3).map((s) => s.title).join(' · ');

  return (
    <Link
      href="/dashboard/community#services"
      className="
        group block rounded-2xl bg-card border border-border/60 px-3.5 py-3
        hover:border-primary/30 hover:shadow-[0_4px_14px_-2px_rgba(20,24,31,0.08)]
        transition-all
      "
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-muted text-foreground/70 flex items-center justify-center">
          <Package size={17} strokeWidth={1.9} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-[15px] font-semibold leading-tight">
            {t('services.title')}
          </div>
          <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">
            {preview}
          </p>
        </div>
        <span
          className="
            shrink-0 rounded-full border border-border bg-background
            text-xs font-semibold px-3.5 py-2 text-foreground
            group-hover:border-primary/40 group-hover:text-primary transition-colors
          "
        >
          {t('services.cta')}
        </span>
      </div>
    </Link>
  );
}
