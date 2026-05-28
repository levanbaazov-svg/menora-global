// Server component — renders today's AI-generated home card.
// Imported by the dashboard home page.

import Link from 'next/link';
import { getDailyHomeSuggestion } from '@/lib/ai/suggestions';

export async function DailyHomeCard({ userId }: { userId: string }) {
  const s = await getDailyHomeSuggestion(userId);

  return (
    <Link
      href={s.cta_href}
      className="
        group relative block rounded-2xl overflow-hidden
        bg-(--color-bg-elevated) border border-(--color-border)/70
        shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]
        hover:border-(--color-gold)/40
        transition-all duration-200 hover:-translate-y-[2px]
        p-5 md:p-6
      "
    >
      {/* Gold radial glow on hover */}
      <div
        aria-hidden
        className="absolute -top-12 -right-12 w-44 h-44 rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-300 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--color-gold-soft) 0%, transparent 70%)' }}
      />

      <div className="relative flex items-start gap-4">
        <div className="shrink-0 text-3xl md:text-4xl float">{s.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.2em] text-(--color-gold-dark) font-semibold mb-1.5 flex items-center gap-1.5">
            ✦ AI · сегодня для тебя
          </div>
          <h3 className="font-serif text-lg md:text-xl font-semibold leading-snug mb-1">
            {s.title}
          </h3>
          <p className="text-sm text-(--color-fg-muted) leading-relaxed">
            {s.body}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-(--color-deep) group-hover:text-(--color-gold-dark) transition-colors">
            <span>{s.cta_label}</span>
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
