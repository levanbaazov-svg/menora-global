'use server';

// Events server actions. Use JWT-as-user client so Hasura permissions are
// enforced (we validate the security model in practice, not just on paper).

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { createEventSchema, rsvpSchema } from '@/lib/events/schema';
import { type ActionState, formValues, zodErrorsToMap } from '@/lib/onboarding/action-state';
import { notify } from '@/lib/notifications/create';
import { hasuraAdmin } from '@/lib/hasura';

const INSERT_EVENT = /* GraphQL */ `
  mutation InsertEvent($obj: events_insert_input!) {
    insert_events_one(object: $obj) { id }
  }
`;

const UPSERT_RSVP = /* GraphQL */ `
  mutation UpsertRsvp(
    $event_id: uuid!, $status: rsvp_status!
  ) {
    insert_rsvps_one(
      object: { event_id: $event_id, status: $status }
      on_conflict: {
        constraint: rsvps_event_user_unique
        update_columns: [status, cancelled_at]
      }
    ) { id }
  }
`;

function formObject(fd: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) obj[k] = v;
  return obj;
}

export async function createEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const raw = formObject(formData);
  const parsed = createEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }

  const client = await hasuraAsCurrentUser({ role: 'member' });
  try {
    const res = await client.request<{ insert_events_one: { id: string } | null }>(
      INSERT_EVENT,
      {
        obj: {
          community_id: session.hasura.community_id,
          title: parsed.data.title,
          description: parsed.data.description,
          type: parsed.data.type,
          visibility: parsed.data.visibility,
          starts_at: parsed.data.starts_at,
          ends_at: parsed.data.ends_at,
          location_text: parsed.data.location_text,
          max_attendees: parsed.data.max_attendees,
          status: parsed.data.status,
          // host_user_id is preset by Hasura permission from X-Hasura-User-Id
        },
      },
    );
    const eventId = res.insert_events_one?.id;
    if (!eventId) return { formError: 'Не удалось создать событие (нет прав?)', values: formValues(formData) };
    revalidatePath('/dashboard/events');
    redirect(`/dashboard/events/${eventId}`);
  } catch (e) {
    // Re-throw NEXT_REDIRECT so it propagates
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    const msg = e instanceof Error ? e.message : 'Неизвестная ошибка';
    return { formError: `Hasura: ${msg}`, values: formValues(formData) };
  }
}

export async function setRsvp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const parsed = rsvpSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error) };
  }

  const client = await hasuraAsCurrentUser({ role: 'member' });
  try {
    await client.request(UPSERT_RSVP, parsed.data);

    // Notify event host if not self-RSVP and status is 'yes'
    if (parsed.data.status === 'yes') {
      const ev = await hasuraAdmin.request<{
        events_by_pk: { host_user_id: string; title: string; community_id: string } | null;
      }>(/* GraphQL */ `
        query EventForNotify($id: uuid!) {
          events_by_pk(id: $id) { host_user_id title community_id }
        }
      `, { id: parsed.data.event_id });
      const e = ev.events_by_pk;
      if (e && e.host_user_id !== session.user.id) {
        await notify({
          recipient_user_id: e.host_user_id,
          actor_user_id: session.user.id,
          community_id: e.community_id,
          type: 'event_rsvp_received',
          title: `Кто-то идёт на «${e.title}»`,
          resource_type: 'events', resource_id: parsed.data.event_id,
          link: `/dashboard/events/${parsed.data.event_id}`,
        });
      }
    }

    revalidatePath(`/dashboard/events/${parsed.data.event_id}`);
    revalidatePath('/dashboard/events');
    return { ok: true };
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    const msg = e instanceof Error ? e.message : 'Неизвестная ошибка';
    return { formError: msg };
  }
}
