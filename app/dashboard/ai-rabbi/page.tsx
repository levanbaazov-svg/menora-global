// AI Rabbi hub — pick a scenario or continue a recent conversation.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  AI_SCENARIOS, SCENARIOS, SCENARIO_ENUM_TO_SLUG, type AIScenario,
} from '@/lib/ai/scenarios';
import { isAIConfigured } from '@/lib/ai/openai';

const FETCH_RECENT = /* GraphQL */ `
  query RecentConversations {
    ai_conversations(
      where: { archived_at: { _is_null: true } }
      order_by: { last_message_at: desc_nulls_last }
      limit: 8
    ) {
      id scenario title message_count last_message_at created_at
    }
  }
`;

interface Conv {
  id: string;
  scenario: AIScenario;
  title: string | null;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
}

export default async function AIRabbiHub() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const data = await client.request<{ ai_conversations: Conv[] }>(FETCH_RECENT);
  const recent = data.ai_conversations;
  const configured = isAIConfigured();

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-6 pt-2 pb-12">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-widest text-(--color-gold) mb-1">
          AI Раввин
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight">
          С чем помочь сейчас?
        </h1>
        <p className="text-sm text-(--color-fg-muted) mt-2 max-w-xl">
          Выбери сценарий — каждый со своей экспертизой. Или просто открой свободный разговор.
        </p>
      </header>

      {!configured && (
        <div className="mb-6 rounded-2xl bg-(--color-warning-soft) border border-(--color-warning)/40 p-4 text-sm">
          <div className="font-semibold mb-1">⚠ AI пока не настроен</div>
          <div className="text-(--color-fg-muted)">
            Не задан <code className="text-xs">OPENAI_API_KEY</code> — UI работает, но сообщения вернут ошибку.
          </div>
        </div>
      )}

      {/* Recent conversations */}
      {recent.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-lg font-semibold mb-3">
            ⏱ Последние разговоры
          </h2>
          <div className="space-y-2">
            {recent.map((c) => {
              const meta = SCENARIOS[c.scenario];
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/ai-rabbi/c/${c.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 p-3 hover:border-(--color-gold)/40 transition-colors"
                >
                  <div
                    className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: meta.tint }}
                  >
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {c.title ?? meta.title}
                    </div>
                    <div className="text-xs text-(--color-fg-muted)">
                      {meta.title} · {c.message_count} {c.message_count === 1 ? 'сообщение' : 'сообщений'}
                      {c.last_message_at && ` · ${formatWhen(c.last_message_at)}`}
                    </div>
                  </div>
                  <span className="text-(--color-fg-muted) text-sm">→</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Scenario grid */}
      <section>
        <h2 className="font-serif text-lg font-semibold mb-4">
          ✦ Сценарии
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {AI_SCENARIOS.map((s) => {
            const meta = SCENARIOS[s];
            return (
              <Link
                key={s}
                href={`/dashboard/ai-rabbi/${SCENARIO_ENUM_TO_SLUG[s]}`}
                className="group block rounded-2xl p-5 md:p-6 transition-all hover:scale-[1.02] hover:shadow-[var(--shadow-md)]"
                style={{ background: meta.tint }}
              >
                <div className="text-3xl mb-2">{meta.emoji}</div>
                <div className="font-serif text-base font-semibold leading-tight mb-1">
                  {meta.title}
                </div>
                <div className="text-xs text-(--color-fg-muted) line-clamp-2">
                  {meta.subtitle}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин назад`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ч назад`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} дн назад`;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}
