// Lovable-style proactive AI card for the dashboard home.
// Dark surface, gold inner ring, single primary CTA.

import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { Reveal } from '@/components/motion/Reveal';
import { getDailyHomeSuggestion } from '@/lib/ai/suggestions';
import type { Locale } from '@/i18n/config';

export async function DailyHomeCard({ userId, communityId }: { userId: string; communityId?: string | null }) {
  const locale = (await getLocale()) as Locale;
  const s = await getDailyHomeSuggestion(userId, locale, communityId ?? null);
  const t = await getTranslations('home');

  return (
    <Reveal delay={0.05}>
      <Link
        href={s.cta_href}
        className="
          group block relative rounded-[18px] overflow-hidden px-3.5 py-3
          bg-foreground text-background
          shadow-[0_6px_20px_-4px_rgba(20,24,31,0.18)]
          transition-shadow duration-200 hover:shadow-[0_10px_28px_-6px_rgba(20,24,31,0.28)]
        "
      >
        {/* Soft gold radial in the corner */}
        <div
          aria-hidden
          className="absolute -top-12 -end-12 w-40 h-40 rounded-full pointer-events-none opacity-50"
          style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }}
        />

        <div className="relative flex items-start gap-2.5">
          <div className="shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center">
            <Sparkles size={14} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.16em] text-primary font-semibold mb-0.5">
              {t('aiCardEyebrow')}
            </div>
            <h3 className="font-serif text-[14px] font-semibold leading-snug mb-0.5">
              {s.title}
            </h3>
            <p className="text-[12px] text-background/75 leading-snug line-clamp-2">
              {s.body}
            </p>
            <div className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-primary transition-transform group-hover:translate-x-0.5">
              <span>{s.cta_label}</span>
              <ChevronRight size={12} strokeWidth={2.2} className="rtl:-scale-x-100" />
            </div>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}
