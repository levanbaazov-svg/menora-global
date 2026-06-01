// POST /api/ai/chat — streaming chat endpoint for AI Rabbi.
//
// Flow:
// 1. Authenticate via next-auth session.
// 2. Validate conversation_id belongs to this user (via admin-secret Hasura call).
// 3. Persist incoming user message.
// 4. Build full message history + system prompt.
// 5. Stream gpt-4o-mini response back to client via Vercel AI SDK.
// 6. On stream finish: persist assistant message + token counts.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { cookies } from 'next/headers';
import { COOKIE_NAME as TZ_COOKIE } from '@/app/api/me/timezone/route';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { openai, AI_MODEL, isAIConfigured } from '@/lib/ai/openai';
import { buildSystemPrompt, type AIScenario } from '@/lib/ai/scenarios';
import { buildUserContext } from '@/lib/ai/context';
import { retrieveSources, formatSourcesForPrompt } from '@/lib/ai/rag';

export const runtime = 'nodejs'; // need next-auth Node crypto split
export const maxDuration = 60;   // allow long streams

const FETCH_CONVERSATION = /* GraphQL */ `
  query FetchConv($id: uuid!, $user_id: uuid!) {
    ai_conversations(
      where: { id: { _eq: $id }, user_id: { _eq: $user_id } }
      limit: 1
    ) {
      id scenario title message_count
      messages: messages(order_by: { created_at: asc }) {
        role content
      }
    }
  }
`;

const INSERT_USER_MESSAGE = /* GraphQL */ `
  mutation InsertUserMsg($conversation_id: uuid!, $content: String!) {
    insert_ai_messages_one(object: {
      conversation_id: $conversation_id,
      role: user,
      content: $content
    }) { id }
  }
`;

const INSERT_ASSISTANT_MESSAGE = /* GraphQL */ `
  mutation InsertAssistantMsg(
    $conversation_id: uuid!,
    $content: String!,
    $tokens_input: Int,
    $tokens_output: Int,
    $model: String!
  ) {
    insert_ai_messages_one(object: {
      conversation_id: $conversation_id,
      role: assistant,
      content: $content,
      tokens_input: $tokens_input,
      tokens_output: $tokens_output,
      model: $model
    }) { id }
  }
`;

const UPDATE_TITLE = /* GraphQL */ `
  mutation UpdateTitle($id: uuid!, $title: String!) {
    update_ai_conversations_by_pk(pk_columns: { id: $id }, _set: { title: $title }) { id }
  }
`;

function fail(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: Request) {
  if (!isAIConfigured()) {
    return fail(503, 'AI пока не настроен — нет OPENAI_API_KEY в env');
  }

  const session = await auth();
  if (!session?.user?.id) return fail(401, 'Не авторизован');

  let body: { conversation_id?: string; messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'Invalid JSON');
  }

  const { conversation_id, messages } = body;
  if (!conversation_id) return fail(400, 'conversation_id обязателен');
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return fail(400, 'messages пуст');
  }

  // Load conversation + verify ownership.
  const cd = await hasuraAdmin.request<{
    ai_conversations: Array<{
      id: string; scenario: AIScenario; title: string | null;
      message_count: number;
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    }>;
  }>(FETCH_CONVERSATION, { id: conversation_id, user_id: session.user.id });

  const conv = cd.ai_conversations[0];
  if (!conv) return fail(404, 'Разговор не найден');

  // Extract the latest user message (UI sends rolling history; we trust the last user msg
  // is the new one — older user messages are already persisted from earlier rounds).
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMsg) return fail(400, 'Нет нового сообщения от пользователя');

  // UIMessage parts → plain text (we only support text parts for now).
  const lastUserText = uiMessageToText(lastUserMsg);
  if (!lastUserText.trim()) return fail(400, 'Сообщение пустое');

  // Persist the user message.
  await hasuraAdmin.request(INSERT_USER_MESSAGE, {
    conversation_id, content: lastUserText,
  });

  // Build context + system prompt.
  const cookieStore = await cookies();
  const userTz = cookieStore.get(TZ_COOKIE)?.value ?? null;
  const ctx = await buildUserContext(session.user.id, userTz);
  let systemPrompt = buildSystemPrompt(conv.scenario, ctx);

  // RAG: retrieve relevant Jewish sources for the user's question and inject
  // them into the system prompt so the rabbi answers from real texts + cites.
  try {
    const sources = await retrieveSources(lastUserText, { k: 8 });
    if (sources.length > 0) {
      systemPrompt += `\n\n${formatSourcesForPrompt(sources)}\n\nКогда уместно — опирайся на эти источники и ссылайся на них номерами [1], [2]. Если источники не отвечают на вопрос, отвечай из общего знания традиции и не выдумывай цитаты.`;
    }
  } catch {
    // RAG failure is non-fatal — answer without sources.
  }

  // Build the message array we'll feed to the model:
  //  [system, ...persisted history, current user msg]
  const modelMessages = await convertToModelMessages(messages);

  // Title generation: if this is the first user message, generate a short title.
  const isFirstUserMessage = conv.message_count === 0 && !conv.title;

  const result = streamText({
    model: openai(AI_MODEL),
    system: systemPrompt,
    messages: modelMessages,
    temperature: 0.7,
    onFinish: async ({ text, usage }) => {
      try {
        await hasuraAdmin.request(INSERT_ASSISTANT_MESSAGE, {
          conversation_id,
          content: text,
          tokens_input: usage?.inputTokens ?? null,
          tokens_output: usage?.outputTokens ?? null,
          model: AI_MODEL,
        });

        if (isFirstUserMessage) {
          // Use first 50 chars of user message as a title fallback.
          // (Async LLM title gen is overkill for v1.)
          const title = lastUserText.trim().slice(0, 50)
            + (lastUserText.length > 50 ? '…' : '');
          await hasuraAdmin.request(UPDATE_TITLE, { id: conversation_id, title });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[ai/chat] failed to persist assistant message', e);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}

// ── helpers ─────────────────────────────────────────────────────────────────
function uiMessageToText(msg: UIMessage): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return '';
  return msg.parts
    .map((p) => (p.type === 'text' ? p.text : ''))
    .join('');
}
