'use server';

// Requests board server actions. JWT-as-user — validates RLS.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser, hasuraAdmin } from '@/lib/hasura';
import { notify } from '@/lib/notifications/create';
import {
  createRequestSchema, postReplySchema,
  requestIdSchema, acceptReplySchema, replyIdSchema,
} from '@/lib/requests/schema';
import { type ActionState, formValues, zodErrorsToMap } from '@/lib/onboarding/action-state';

const INSERT_REQUEST = /* GraphQL */ `
  mutation InsertRequest($obj: requests_insert_input!) {
    insert_requests_one(object: $obj) { id }
  }
`;

const INSERT_REPLY = /* GraphQL */ `
  mutation InsertReply($obj: request_replies_insert_input!) {
    insert_request_replies_one(object: $obj) { id }
  }
`;

const UPDATE_REQUEST_STATUS = /* GraphQL */ `
  mutation UpdateRequestStatus($id: uuid!, $patch: requests_set_input!) {
    update_requests_by_pk(pk_columns: { id: $id }, _set: $patch) { id status }
  }
`;

const WITHDRAW_REPLY = /* GraphQL */ `
  mutation WithdrawReply($id: uuid!) {
    update_request_replies_by_pk(pk_columns: { id: $id }, _set: { withdrawn_at: "now()" }) { id }
  }
`;

function formObject(fd: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) obj[k] = v;
  return obj;
}

export async function createRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const parsed = createRequestSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }

  const client = await hasuraAsCurrentUser({ role: 'member' });
  try {
    const expiresAt = parsed.data.expires_in_days
      ? new Date(Date.now() + parsed.data.expires_in_days * 86400_000).toISOString()
      : null;
    const r = await client.request<{ insert_requests_one: { id: string } | null }>(
      INSERT_REQUEST,
      {
        obj: {
          community_id: session.hasura.community_id,
          category: parsed.data.category,
          urgency: parsed.data.urgency,
          title: parsed.data.title,
          body: parsed.data.body,
          expires_at: expiresAt,
          // user_id is preset by Hasura permission from X-Hasura-User-Id
        },
      },
    );
    const id = r.insert_requests_one?.id;
    if (!id) return { formError: 'Не удалось создать просьбу', values: formValues(formData) };
    revalidatePath('/dashboard/requests');
    redirect(`/dashboard/requests/${id}`);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка', values: formValues(formData) };
  }
}

export async function postReply(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const parsed = postReplySchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }

  const client = await hasuraAsCurrentUser({ role: 'member' });
  try {
    await client.request(INSERT_REPLY, {
      obj: {
        request_id: parsed.data.request_id,
        body: parsed.data.body,
        contact_method: parsed.data.contact_method,
        contact_phone: parsed.data.contact_method === 'share_phone' ? parsed.data.contact_phone : null,
        contact_email: parsed.data.contact_method === 'share_email' ? parsed.data.contact_email : null,
      },
    });

    // Notify request author
    const req = await hasuraAdmin.request<{
      requests_by_pk: { user_id: string; title: string; community_id: string } | null;
    }>(/* GraphQL */ `
      query RequestForNotify($id: uuid!) {
        requests_by_pk(id: $id) { user_id title community_id }
      }
    `, { id: parsed.data.request_id });
    const r = req.requests_by_pk;
    if (r && r.user_id !== session.user.id) {
      await notify({
        recipient_user_id: r.user_id,
        actor_user_id: session.user.id,
        community_id: r.community_id,
        type: 'request_replied',
        title: `Новый ответ на «${r.title}»`,
        resource_type: 'requests', resource_id: parsed.data.request_id,
        link: `/dashboard/requests/${parsed.data.request_id}`,
      });
    }

    revalidatePath(`/dashboard/requests/${parsed.data.request_id}`);
    revalidatePath('/dashboard/requests');
    return { ok: true };
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка', values: formValues(formData) };
  }
}

export async function markFulfilled(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return updateStatus(formData, { status: 'fulfilled', fulfilled_at: 'now()' });
}

export async function markInProgress(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return updateStatus(formData, { status: 'in_progress' });
}

export async function cancelRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return updateStatus(formData, { status: 'cancelled', cancelled_at: 'now()' });
}

export async function reopenRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return updateStatus(formData, { status: 'open', fulfilled_at: null, cancelled_at: null });
}

async function updateStatus(formData: FormData, patch: Record<string, unknown>): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  const parsed = requestIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };

  const client = await hasuraAsCurrentUser({ role: 'member' });
  try {
    await client.request(UPDATE_REQUEST_STATUS, { id: parsed.data.request_id, patch });
    revalidatePath(`/dashboard/requests/${parsed.data.request_id}`);
    revalidatePath('/dashboard/requests');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

export async function acceptReply(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  const parsed = acceptReplySchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };

  const client = await hasuraAsCurrentUser({ role: 'member' });
  try {
    await client.request(UPDATE_REQUEST_STATUS, {
      id: parsed.data.request_id,
      patch: {
        status: 'fulfilled',
        accepted_reply_id: parsed.data.reply_id,
        fulfilled_at: 'now()',
      },
    });

    // Notify reply author that their reply was accepted
    const ctx = await hasuraAdmin.request<{
      requests_by_pk: { title: string; community_id: string } | null;
      request_replies_by_pk: { user_id: string } | null;
    }>(/* GraphQL */ `
      query AcceptCtx($req_id: uuid!, $reply_id: uuid!) {
        requests_by_pk(id: $req_id) { title community_id }
        request_replies_by_pk(id: $reply_id) { user_id }
      }
    `, { req_id: parsed.data.request_id, reply_id: parsed.data.reply_id });
    const replier = ctx.request_replies_by_pk;
    const r = ctx.requests_by_pk;
    if (replier && r && replier.user_id !== session.user.id) {
      await notify({
        recipient_user_id: replier.user_id,
        actor_user_id: session.user.id,
        community_id: r.community_id,
        type: 'request_reply_accepted',
        title: `Твой ответ принят: «${r.title}»`,
        resource_type: 'requests', resource_id: parsed.data.request_id,
        link: `/dashboard/requests/${parsed.data.request_id}`,
      });
    }

    revalidatePath(`/dashboard/requests/${parsed.data.request_id}`);
    revalidatePath('/dashboard/requests');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

export async function withdrawReply(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  const parsed = replyIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };

  const client = await hasuraAsCurrentUser({ role: 'member' });
  try {
    await client.request(WITHDRAW_REPLY, { id: parsed.data.reply_id });
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}
