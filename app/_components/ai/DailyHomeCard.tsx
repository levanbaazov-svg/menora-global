// Server component — renders today's AI-generated home card.
// Rebuilt on shadcn Card with motion-friendly hover state.

import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getDailyHomeSuggestion } from '@/lib/ai/suggestions';

export async function DailyHomeCard({ userId }: { userId: string }) {
  const s = await getDailyHomeSuggestion(userId);

  return (
    <Link href={s.cta_href} className="block group">
      <Card className="relative p-5 md:p-6 hover:ring-primary/40 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer">
        {/* Gold radial glow */}
        <div
          aria-hidden
          className="absolute -top-12 -right-12 w-44 h-44 rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-500 pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--color-gold-soft) 0%, transparent 70%)' }}
        />

        <div className="relative flex items-start gap-4">
          <div className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/60 text-2xl">
            {s.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-amber-700 font-semibold mb-1.5">
              <Sparkles className="h-3 w-3" />
              AI · сегодня для тебя
            </div>
            <h3 className="font-serif text-lg md:text-xl font-semibold leading-snug mb-1">
              {s.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold transition-transform duration-200 group-hover:translate-x-0.5">
              <span>{s.cta_label}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
