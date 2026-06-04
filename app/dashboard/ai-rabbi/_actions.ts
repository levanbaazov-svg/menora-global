'use server';

// AI Rabbi: server actions for conversation lifecycle.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { z } from 'zod';
import {
  AI_SCENARIOS, type AIScenario, SCENARIO_SLUG_TO_ENUM,
} from '@/lib/ai/scenarios';
import { type ActionState } from '@/lib/onboarding/action-state';

const INSERT_CONVERSATION = /* GraphQL */ `
  mutation InsertConv($obj: ai_conversations_insert_input!) {
    insert_ai_conversations_one(object: $obj) { id }
  }
`;

const ARCHIVE_CONVERSATION = /* GraphQL */ `
  mutation ArchiveConv($id: uuid!) {
    update_ai_conversations_by_pk(
      pk_columns: { id: $id }
      _set: { archived_at: "now()" }
    ) { id }
  }
`;

const RENAME_CONVERSATION = /* GraphQL */ `
  mutation RenameConv($id: uuid!, $title: String!) {
    update_ai_conversations_by_pk(
      pk_columns: { id: $id }
      _set: { title: $title }
    ) { id }
  }
`;

const startSchema = z.object({
  scenario: z.string().refine(
    (s) => s in SCENARIO_SLUG_TO_ENUM || (AI_SCENARIOS as readonly string[]).includes(s),
    { message: 'Неизвестный сценарий' },
  ),
});

/** Creates a new conversation and redirects into its chat view. */
export async function startConversation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { formError: 'Не авторизован' };

  const raw = Object.fromEntries(formData.entries());
  const parsed = startSchema.safeParse(raw);
  if (!parsed.success) return { formError: parsed.error.issues[0].message };

  const scenarioEnum: AIScenario =
    SCENARIO_SLUG_TO_ENUM[parsed.data.scenario] ?? (parsed.data.scenario as AIScenario);

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  try {
    const r = await client.request<{ insert_ai_conversations_one: { id: string } | null }>(
      INSERT_CONVERSATION,
      {
        // user_id is preset by the Hasura insert permission (X-Hasura-User-Id);
        // passing it explicitly is rejected as a non-insertable column.
        obj: {
          scenario: scenarioEnum,
          community_id: session.hasura.community_id,
        },
      },
    );
    const id = r.insert_ai_conversations_one?.id;
    if (!id) return { formError: 'Не удалось создать разговор' };
    revalidatePath('/dashboard/ai-rabbi');
    redirect(`/dashboard/ai-rabbi/c/${id}`);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

const FIND_EMPTY_IN_SCENARIO = /* GraphQL */ `
  query FindEmpty($scenario: ai_scenario!) {
    ai_conversations(
      where: { scenario: { _eq: $scenario }, archived_at: { _is_null: true }, message_count: { _eq: 0 } }
      order_by: { created_at: desc }
      limit: 1
    ) { id }
  }
`;

/**
 * One-tap entry from a scenario tile: skip the explanatory landing page and go
 * straight into the chat. Reuses an existing empty conversation for the scenario
 * so repeated taps don't pile up blank threads.
 */
export async function openScenario(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const slug = String(formData.get('scenario') ?? '');
  const scenarioEnum: AIScenario | undefined =
    SCENARIO_SLUG_TO_ENUM[slug] ?? ((AI_SCENARIOS as readonly string[]).includes(slug) ? (slug as AIScenario) : undefined);
  if (!scenarioEnum) redirect('/dashboard/ai-rabbi');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });

  const found = await client.request<{ ai_conversations: Array<{ id: string }> }>(
    FIND_EMPTY_IN_SCENARIO, { scenario: scenarioEnum },
  );
  let id: string | undefined = found.ai_conversations[0]?.id;

  if (!id) {
    const r = await client.request<{ insert_ai_conversations_one: { id: string } | null }>(
      INSERT_CONVERSATION,
      { obj: { scenario: scenarioEnum, community_id: session.hasura.community_id } },
    );
    id = r.insert_ai_conversations_one?.id ?? undefined;
  }
  if (!id) throw new Error('Не удалось открыть разговор');

  revalidatePath('/dashboard/ai-rabbi');
  redirect(`/dashboard/ai-rabbi/c/${id}`);
}

/**
 * Free-text entry point from the home screen's "Спросить раввина" bar.
 * Creates an `open` conversation and hands off to the chat view, passing the
 * first message as a `?q=` param so the chat auto-sends it on mount.
 */
export async function askRabbiFromHome(text: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const trimmed = text.trim().slice(0, 2000);
  if (!trimmed) return;

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const r = await client.request<{ insert_ai_conversations_one: { id: string } | null }>(
    INSERT_CONVERSATION,
    {
      // user_id is preset by the insert permission (X-Hasura-User-Id).
      obj: {
        scenario: 'open' satisfies AIScenario,
        community_id: session.hasura.community_id,
      },
    },
  );
  const id = r.insert_ai_conversations_one?.id;
  if (!id) throw new Error('Не удалось создать разговор');
  revalidatePath('/dashboard/ai-rabbi');
  redirect(`/dashboard/ai-rabbi/c/${id}?q=${encodeURIComponent(trimmed)}`);
}

const idSchema = z.object({ conversation_id: z.string().uuid() });

export async function archiveConversation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { formError: 'Не авторизован' };

  const parsed = idSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { formError: 'Неверный id' };

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  try {
    await client.request(ARCHIVE_CONVERSATION, { id: parsed.data.conversation_id });
    revalidatePath('/dashboard/ai-rabbi');
    redirect('/dashboard/ai-rabbi');
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

const renameSchema = z.object({
  conversation_id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
});

export async function renameConversation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { formError: 'Не авторизован' };

  const parsed = renameSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { formError: parsed.error.issues[0].message };

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  try {
    await client.request(RENAME_CONVERSATION, {
      id: parsed.data.conversation_id,
      title: parsed.data.title,
    });
    revalidatePath(`/dashboard/ai-rabbi/c/${parsed.data.conversation_id}`);
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}
