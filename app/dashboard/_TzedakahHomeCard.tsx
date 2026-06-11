// Тихий блок «Цдака» на главной: коробочка-иконка, цитата, кнопка → раздел.
// Намеренно без фото/прогрессов — спокойный визуальный акцент.

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { HandCoins } from 'lucide-react';

export async function TzedakahHomeCard() {
  const t = await getTranslations('tzedakah');

  return (
    <Link
      href="/dashboard/tzedakah"
      className="
        group block rounded-2xl border border-primary/15 bg-primary/[0.04]
        px-3.5 py-3 hover:border-primary/30 transition-colors
      "
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-primary/12 text-primary flex items-center justify-center">
          <HandCoins size={17} strokeWidth={1.9} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-[15px] font-semibold leading-tight">
            {t('homeTitle')}
          </div>
          <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug italic line-clamp-2">
            «{t('homeQuote')}» — {t('homeQuoteSource')}
          </p>
        </div>
        <span
          className="
            shrink-0 rounded-full bg-primary text-primary-foreground
            text-xs font-semibold px-3.5 py-2
            group-hover:opacity-90 transition-opacity
          "
        >
          {t('homeCta')}
        </span>
      </div>
    </Link>
  );
}
