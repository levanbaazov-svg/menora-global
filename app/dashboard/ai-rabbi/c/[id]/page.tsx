// Conversation view — loads history server-side, hands off to client Chat component.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { SCENARIOS, type AIScenario } from '@/lib/ai/scenarios';
import { Chat } from './Chat';

const FETCH = /* GraphQL */ `
  query ConvHistory($id: uuid!) {
    ai_conversations_by_pk(id: $id) {
      id scenario title message_count archived_at
    }
    ai_messages(
      where: {
        conversation_id: { _eq: $id }
        role: { _neq: system }
      }
      order_by: { created_at: asc }
    ) {
      id role content created_at
    }
  }
`;

interface Resp {
  ai_conversations_by_pk: {
    id: string;
    scenario: AIScenario;
    title: string | null;
    message_count: number;
    archived_at: string | null;
  } | null;
  ai_messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
  }>;
}

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const t = await getTranslations('aiMisc');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const data = await client.request<Resp>(FETCH, { id });

  const conv = data.ai_conversations_by_pk;
  if (!conv || conv.archived_at) notFound();

  const meta = SCENARIOS[conv.scenario];

  // Initial UIMessages: persisted history shaped for @ai-sdk/react useChat.
  // We synthesize an "opener" assistant message if conversation is empty.
  const initialMessages = data.ai_messages.length === 0
    ? [{
        id: 'opener',
        role: 'assistant' as const,
        parts: [{ type: 'text' as const, text: meta.opener }],
      }]
    : data.ai_messages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: 'text' as const, text: m.content }],
      }));

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-6 pt-2 pb-4 flex flex-col" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 py-2 mb-2 border-b border-(--color-border)/60">
        <Link
          href="/dashboard/ai-rabbi"
          className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) shrink-0 rtl:-scale-x-100"
        >
          ←
        </Link>
        <div
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: meta.tint }}
        >
          {meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">
            {conv.title ?? meta.title}
          </div>
          <div className="text-xs text-(--color-fg-muted)">
            {t('aiRabbiSubtitle')} · {meta.title}
          </div>
        </div>
      </div>

      <Chat
        conversationId={conv.id}
        scenarioTitle={meta.title}
        scenarioEmoji={meta.emoji}
        scenarioTint={meta.tint}
        examplePrompts={meta.examplePrompts}
        initialMessages={initialMessages}
        autoSendText={data.ai_messages.length === 0 ? (q?.trim() || undefined) : undefined}
      />
    </div>
  );
}
