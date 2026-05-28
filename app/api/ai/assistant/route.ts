// POST /api/ai/assistant — streaming endpoint for the rabbi assistant.
// Multi-step tool calling: up to 5 tool invocations per user turn.

import { auth } from '@/lib/auth';
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai';
import { openai, AI_MODEL, isAIConfigured } from '@/lib/ai/openai';
import { buildTools } from '@/lib/ai/assistant/tools';
import { buildAssistantSystemPrompt } from '@/lib/ai/assistant/system-prompt';
import { buildUserContext } from '@/lib/ai/context';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

  // Rabbi/admin only.
  const role = session.hasura.default_role;
  if (role !== 'rabbi' && role !== 'admin') {
    return fail(403, 'Эта функция только для раввинов и админов общины');
  }

  let body: { messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'Invalid JSON');
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return fail(400, 'messages пуст');
  }

  // Build tools + system prompt
  const tools = buildTools({
    userId: session.user.id,
    communityId: session.hasura.community_id,
  });

  const ctx = await buildUserContext(session.user.id, null);
  const systemPrompt = buildAssistantSystemPrompt({
    rabbiName: ctx.userName,
    communityName: ctx.communityName,
    todayHebrew: ctx.todayHebrew,
    parsha: ctx.parsha,
    timezone: ctx.timezone,
  });

  const modelMessages = await convertToModelMessages(body.messages);

  const result = streamText({
    model: openai(AI_MODEL),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    // Multi-step: keep going until the model produces a final answer
    // or hits the cap. 5 is enough for "find member → summary → add task → confirm".
    stopWhen: stepCountIs(5),
    temperature: 0.4,   // lower than chat — actions need to be deterministic
  });

  return result.toUIMessageStreamResponse();
}
