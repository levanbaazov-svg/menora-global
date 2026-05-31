// AI Rabbi hub — list of scenarios + recent conversations.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { AI_SCENARIOS, SCENARIOS, SCENARIO_ENUM_TO_SLUG } from '@/lib/ai/scenarios';

const FETCH = /* GraphQL */ `
  query AiRabbiHub($user_id: uuid!) {
    ai_conversations(
      where: { user_id: { _eq: $user_id }, archived_at: { _is_null: true } }
      order_by: { last_message_at: desc_nulls_last }
      limit: 20
    ) {
      id scenario title message_count last_message_at
    }
  }
`;

interface Conv {
  id: string; scenario: string; title: string | null;
  message_count: number; last_message_at: string | null;
}

// Pastel gradient per scenario tint (matches home scenario tiles)
const TINT_GRADIENT: Record<string, string> = {
  yellow:   'linear-gradient(135deg, oklch(0.975 0.03 95), oklch(0.945 0.07 88))',
  lavender: 'linear-gradient(135deg, oklch(0.97 0.025 300), oklch(0.93 0.05 295))',
  mint:     'linear-gradient(135deg, oklch(0.975 0.03 165), oklch(0.94 0.055 160))',
  rose:     'linear-gradient(135deg, oklch(0.975 0.025 20), oklch(0.94 0.05 22))',
  sky:      'linear-gradient(135deg, oklch(0.975 0.025 235), oklch(0.94 0.045 232))',
  cream:    'linear-gradient(135deg, oklch(0.98 0.02 60), oklch(0.95 0.045 52))',
};

export default async function AiRabbiHub() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { ai_conversations } = await client.request<{ ai_conversations: Conv[] }>(
    FETCH, { user_id: session.user.id },
  );

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-8">
      <header className="mb-4 px-0.5">
        <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
          AI Раввин
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">С чего начнём?</p>
      </header>

      {/* Scenario grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-7">
        {AI_SCENARIOS.filter((s) => s !== 'open').map((s, i) => {
          const meta = SCENARIOS[s];
          const slug = SCENARIO_ENUM_TO_SLUG[s];
          return (
            <Reveal key={s} delay={0.03 * i}>
              <Link
                href={`/dashboard/ai-rabbi/${slug}`}
                style={{ backgroundImage: TINT_GRADIENT[(meta.tint.match(/pastel-(\w+)/)?.[1]) ?? 'cream'] }}
                className="group flex items-center justify-between gap-2 rounded-[20px] px-3.5 py-3 min-h-[76px] shadow-[0_1px_3px_rgba(20,24,31,0.05)] hover:shadow-[0_6px_18px_-4px_rgba(20,24,31,0.12)] transition-shadow"
              >
                <div className="min-w-0">
                  <div className="font-serif text-[15px] font-semibold leading-[1.15] tracking-tight">{meta.title}</div>
                  <div className="text-[11px] text-foreground/55 mt-0.5 leading-snug">{meta.subtitle}</div>
                </div>
                <div className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-foreground/90 text-background transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                  <ArrowUpRight size={13} strokeWidth={2.4} />
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>

      {/* Recent conversations */}
      {ai_conversations.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2 px-0.5">
            Недавние разговоры
          </h2>
          <div className="rounded-2xl bg-card ring-1 ring-border/70 divide-y divide-border/60 overflow-hidden">
            {ai_conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/dashboard/ai-rabbi/c/${conv.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground/60 shrink-0">
                  <MessageCircle size={15} strokeWidth={1.9} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight truncate">
                    {conv.title ?? SCENARIOS[conv.scenario as keyof typeof SCENARIOS]?.title ?? 'Разговор'}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{conv.message_count} сообщений</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
