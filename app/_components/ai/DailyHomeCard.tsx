// Lovable-style proactive AI card for the dashboard home.
// Dark surface, gold inner ring, single primary CTA.

import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Reveal } from '@/components/motion/Reveal';
import { getDailyHomeSuggestion } from '@/lib/ai/suggestions';

export async function DailyHomeCard({ userId }: { userId: string }) {
  const s = await getDailyHomeSuggestion(userId);
  const t = await getTranslations('home');

  return (
    <Reveal delay={0.05}>
      <Link
        href={s.cta_href}
        className="
          group block relative rounded-[20px] overflow-hidden p-4
          bg-foreground text-background
          shadow-[0_6px_20px_-4px_rgba(20,24,31,0.18)]
          transition-shadow duration-200 hover:shadow-[0_10px_28px_-6px_rgba(20,24,31,0.28)]
        "
      >
        {/* Soft gold radial in the corner */}
        <div
          aria-hidden
          className="absolute -top-14 -right-14 w-48 h-48 rounded-full pointer-events-none opacity-50"
          style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }}
        />

        <div className="relative flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
            <Sparkles size={15} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.18em] text-primary font-semibold mb-1">
              {t('aiCardEyebrow')}
            </div>
            <h3 className="font-serif text-[15px] font-semibold leading-snug mb-1">
              {s.title}
            </h3>
            <p className="text-[13px] text-background/75 leading-snug line-clamp-2">
              {s.body}
            </p>
            <div className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary transition-transform group-hover:translate-x-0.5">
              <span>{s.cta_label}</span>
              <ChevronRight size={13} strokeWidth={2.2} />
            </div>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}
