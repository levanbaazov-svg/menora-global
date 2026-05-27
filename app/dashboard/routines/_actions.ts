'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { hebrewDate } from '@/lib/hebcal';
import {
  createRoutineSchema, routineIdSchema,
} from '@/lib/routines/schema';
import { type ActionState, formValues, zodErrorsToMap } from '@/lib/onboarding/action-state';

const INSERT_ROUTINE = /* GraphQL */ `
  mutation InsertRoutine($obj: routines_insert_input!) {
    insert_routines_one(object: $obj) { id }
  }
`;

const DELETE_ROUTINE = /* GraphQL */ `
  mutation DeleteRoutine($id: uuid!) {
    delete_routines_by_pk(id: $id) { id }
  }
`;

const TOGGLE_ENABLED = /* GraphQL */ `
  mutation ToggleEnabled($id: uuid!, $enabled: Boolean!) {
    update_routines_by_pk(pk_columns: { id: $id }, _set: { enabled: $enabled }) {
      id enabled
    }
  }
`;

// UPSERT — idempotent: clicking twice doesn't double-insert thanks to the
// (user_id, routine_id, gregorian_date) unique constraint. One roundtrip.
const UPSERT_CHECKIN = /* GraphQL */ `
  mutation UpsertCheckin($obj: checkins_insert_input!) {
    insert_checkins_one(
      object: $obj
      on_conflict: {
        constraint: checkins_user_routine_date_unique
        update_columns: []
      }
    ) { id }
  }
`;

const DELETE_CHECKIN_BY_DATE = /* GraphQL */ `
  mutation DeleteCheckinByDate($routine_id: uuid!, $date: date!) {
    delete_checkins(where: {
      routine_id: { _eq: $routine_id }
      gregorian_date: { _eq: $date }
    }) { affected_rows }
  }
`;

function formObject(fd: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k === 'days_of_week') continue;
    obj[k] = v;
  }
  const dow = fd.getAll('days_of_week');
  if (dow.length > 0) obj.days_of_week = dow;
  return obj;
}

function todayInTz(tz: string): string {
  // 'YYYY-MM-DD' in given timezone
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}

export async function createRoutine(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const parsed = createRoutineSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }

  const client = await hasuraAsCurrentUser({ role: 'member' });
  try {
    await client.request(INSERT_ROUTINE, {
      obj: {
        type: parsed.data.type,
        custom_label: parsed.data.custom_label ?? null,
        target_time: parsed.data.target_time,
        days_of_week: parsed.data.days_of_week,
        reminder_offset_minutes: parsed.data.reminder_offset_minutes,
        community_id: session.hasura.community_id,
        // user_id is preset by Hasura permission
      },
    });
    revalidatePath('/dashboard/routines');
    redirect('/dashboard/routines');
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка', values: formValues(formData) };
  }
}

export async function deleteRoutine(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  const parsed = routineIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };

  const client = await hasuraAsCurrentUser({ role: 'member' });
  try {
    await client.request(DELETE_ROUTINE, { id: parsed.data.routine_id });
    revalidatePath('/dashboard/routines');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

export async function toggleEnabled(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  const parsed = routineIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };
  const enabled = formData.get('enabled') === 'true';

  const client = await hasuraAsCurrentUser({ role: 'member' });
  try {
    await client.request(TOGGLE_ENABLED, { id: parsed.data.routine_id, enabled });
    revalidatePath('/dashboard/routines');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

/**
 * Set today's check-in for a routine to the desired state.
 * Client decides the new value (optimistic UI) and passes it explicitly.
 * One Hasura roundtrip; idempotent.
 */
export async function setCheckin(routineId: string, desired: boolean): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const today = todayInTz('UTC');
  const client = await hasuraAsCurrentUser({ role: 'member' });

  if (desired) {
    const hebText = hebrewDate(new Date(today + 'T12:00:00Z'), 'ru');
    await client.request(UPSERT_CHECKIN, {
      obj: {
        routine_id: routineId,
        gregorian_date: today,
        hebrew_date_text: hebText,
        // user_id preset by Hasura permission
      },
    });
  } else {
    await client.request(DELETE_CHECKIN_BY_DATE, { routine_id: routineId, date: today });
  }

  revalidatePath('/dashboard/routines');
}
