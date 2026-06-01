// Scenario landing — shows hero + example prompts + "Start" button.
// Optionally lists recent conversations in this same scenario.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { LOCALE_BCP47, isLocale } from '@/i18n/config';
import {
  SCENARIOS, SCENARIO_SLUG_TO_ENUM, type AIScenario,
} from '@/lib/ai/scenarios';
import { StartConversationButton } from './StartConversationButton';

const FETCH_RECENT_IN_SCENARIO = /* GraphQL */ `
  query RecentInScenario($scenario: ai_scenario!) {
    ai_conversations(
      where: { scenario: { _eq: $scenario }, archived_at: { _is_null: true } }
      order_by: { last_message_at: desc_nulls_last }
      limit: 5
    ) {
      id title message_count last_message_at
    }
  }
`;

export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ scenario: string }>;
}) {
  const { scenario: slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const scenarioEnum: AIScenario | undefined = SCENARIO_SLUG_TO_ENUM[slug];
  if (!scenarioEnum) notFound();

  const meta = SCENARIOS[scenarioEnum];

  const t = await getTranslations('aiPublic');
  const locale = await getLocale();
  const bcp47 = isLocale(locale) ? LOCALE_BCP47[locale] : 'ru-RU';

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const data = await client.request<{
    ai_conversations: Array<{
      id: string; title: string | null; message_count: number; last_message_at: string | null;
    }>;
  }>(FETCH_RECENT_IN_SCENARIO, { scenario: scenarioEnum });

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-6 pt-2 pb-12">
      <Link
        href="/dashboard/ai-rabbi"
        className="inline-block text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-6"
      >
        {t('scenario.backToScenarios')}
      </Link>

      {/* Hero */}
      <div
        className="rounded-3xl p-8 md:p-10 mb-6 text-center"
        style={{ background: meta.tint }}
      >
        <div className="text-6xl mb-4">{meta.emoji}</div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-3">{meta.title}</h1>
        <p className="text-(--color-fg-muted) leading-relaxed max-w-md mx-auto">
          {meta.subtitle}
        </p>
      </div>

      {/* Start button */}
      <div className="mb-8">
        <StartConversationButton scenarioSlug={slug} />
      </div>

      {/* Recent in this scenario */}
      {data.ai_conversations.length > 0 && (
        <section className="mb-8">
          <h2 className="font-serif text-base font-semibold mb-3">
            {t('scenario.yourConversations')}
          </h2>
          <div className="space-y-2">
            {data.ai_conversations.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/ai-rabbi/c/${c.id}`}
                className="block rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 p-3 hover:border-(--color-gold)/40 transition-colors"
              >
                <div className="font-medium text-sm truncate">
                  {c.title ?? t('scenario.untitled')}
                </div>
                <div className="text-xs text-(--color-fg-muted) mt-0.5">
                  {c.message_count} {c.message_count === 1 ? t('scenario.messageOne') : t('scenario.messageMany')}
                  {c.last_message_at && ` · ${new Date(c.last_message_at).toLocaleDateString(bcp47)}`}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Example prompts */}
      <section>
        <div className="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-3">
          {t('scenario.examplesLabel')}
        </div>
        <div className="space-y-2">
          {meta.examplePrompts.map((q, i) => (
            <div
              key={i}
              className="rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 px-4 py-3 text-sm text-(--color-fg-muted)"
            >
              «{q}»
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
