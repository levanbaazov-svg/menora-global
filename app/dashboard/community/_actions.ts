'use server';

// Places + programs server actions.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import {
  createPlaceSchema, placeIdSchema, approvePlaceSchema, rejectPlaceSchema,
  createProgramSchema, enrollProgramSchema,
} from '@/lib/places/schema';
import { type ActionState, formValues, zodErrorsToMap } from '@/lib/onboarding/action-state';

const INSERT_PLACE = /* GraphQL */ `
  mutation InsertPlace($obj: places_insert_input!) {
    insert_places_one(object: $obj) { id }
  }
`;

const APPROVE_PLACE = /* GraphQL */ `
  mutation ApprovePlace($id: uuid!, $approver: uuid!) {
    update_places_by_pk(
      pk_columns: { id: $id }
      _set: { submission_status: approved, approved_by: $approver, approved_at: "now()" }
    ) { id }
  }
`;

const REJECT_PLACE = /* GraphQL */ `
  mutation RejectPlace($id: uuid!, $approver: uuid!, $reason: String!) {
    update_places_by_pk(
      pk_columns: { id: $id }
      _set: { submission_status: rejected, approved_by: $approver, rejection_reason: $reason }
    ) { id }
  }
`;

const ARCHIVE_PLACE = /* GraphQL */ `
  mutation ArchivePlace($id: uuid!) {
    update_places_by_pk(
      pk_columns: { id: $id }
      _set: { archived_at: "now()" }
    ) { id }
  }
`;

const INSERT_PROGRAM = /* GraphQL */ `
  mutation InsertProgram($obj: programs_insert_input!) {
    insert_programs_one(object: $obj) { id }
  }
`;

const ENROLL_PROGRAM = /* GraphQL */ `
  mutation EnrollProgram($obj: program_enrollments_insert_input!) {
    insert_program_enrollments_one(object: $obj) { id }
  }
`;

function formObject(fd: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k === 'cuisine_tags' || k === 'dietary_tags') continue;
    obj[k] = v;
  }
  const cuisine = fd.getAll('cuisine_tags');
  if (cuisine.length > 0) obj.cuisine_tags = cuisine;
  const dietary = fd.getAll('dietary_tags');
  if (dietary.length > 0) obj.dietary_tags = dietary;
  return obj;
}

async function requireAuth(): Promise<{ userId: string; communityId: string; role: string; isStaff: boolean }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  const role = session.hasura.default_role;
  return {
    userId: session.user.id,
    communityId: session.hasura.community_id,
    role,
    isStaff: role === 'rabbi' || role === 'admin',
  };
}

// ── Submit / create place ──────────────────────────────────────────────────
export async function submitPlace(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, communityId, role, isStaff } = await requireAuth();
  const parsed = createPlaceSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }

  const client = await hasuraAsCurrentUser({ role });
  try {
    // Rabbi/admin: auto-approve. Member: goes to pending.
    const obj: Record<string, unknown> = {
      community_id: communityId,
      ...parsed.data,
    };
    if (isStaff) {
      obj.submission_status = 'approved';
      obj.approved_by = userId;
      obj.approved_at = 'now()';
    }

    const r = await client.request<{ insert_places_one: { id: string } | null }>(
      INSERT_PLACE, { obj },
    );
    const id = r.insert_places_one?.id;
    if (!id) return { formError: 'Не удалось создать место', values: formValues(formData) };
    revalidatePath('/dashboard/community');
    redirect(`/dashboard/community/places/${id}`);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка', values: formValues(formData) };
  }
}

export async function approvePlace(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, role, isStaff } = await requireAuth();
  if (!isStaff) return { formError: 'Нужны права rabbi/admin' };
  const parsed = approvePlaceSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };

  const client = await hasuraAsCurrentUser({ role });
  try {
    await client.request(APPROVE_PLACE, { id: parsed.data.place_id, approver: userId });
    revalidatePath('/dashboard/community');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

export async function rejectPlace(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, role, isStaff } = await requireAuth();
  if (!isStaff) return { formError: 'Нужны права rabbi/admin' };
  const parsed = rejectPlaceSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };

  const client = await hasuraAsCurrentUser({ role });
  try {
    await client.request(REJECT_PLACE, {
      id: parsed.data.place_id, approver: userId, reason: parsed.data.reason,
    });
    revalidatePath('/dashboard/community');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

export async function archivePlace(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { role, isStaff } = await requireAuth();
  if (!isStaff) return { formError: 'Нужны права rabbi/admin' };
  const parsed = placeIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };

  const client = await hasuraAsCurrentUser({ role });
  try {
    await client.request(ARCHIVE_PLACE, { id: parsed.data.place_id });
    revalidatePath('/dashboard/community');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

// ── Programs ──────────────────────────────────────────────────────────────
export async function createProgram(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { communityId, role, isStaff } = await requireAuth();
  if (!isStaff) return { formError: 'Только rabbi/admin может создавать программы' };
  const parsed = createProgramSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }

  const client = await hasuraAsCurrentUser({ role });
  try {
    const r = await client.request<{ insert_programs_one: { id: string } | null }>(
      INSERT_PROGRAM,
      { obj: { community_id: communityId, ...parsed.data } },
    );
    const id = r.insert_programs_one?.id;
    if (!id) return { formError: 'Не удалось создать программу', values: formValues(formData) };
    revalidatePath('/dashboard/community');
    redirect(`/dashboard/community/programs/${id}`);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка', values: formValues(formData) };
  }
}

export async function enrollProgram(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { role } = await requireAuth();
  const parsed = enrollProgramSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }
  const client = await hasuraAsCurrentUser({ role });
  try {
    await client.request(ENROLL_PROGRAM, { obj: parsed.data });
    revalidatePath(`/dashboard/community/programs/${parsed.data.program_id}`);
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка', values: formValues(formData) };
  }
}

// ── Community profile (rabbi/admin) ────────────────────────────────────────
import { updateCommunitySchema } from '@/lib/community/schema';

const UPDATE_COMMUNITY = /* GraphQL */ `
  mutation UpdateCommunity($id: uuid!, $set: communities_set_input!) {
    update_communities_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

export async function updateCommunity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  const role = session.hasura.default_role;
  if (role !== 'rabbi' && role !== 'admin') {
    return { formError: 'Только раввин или админ может редактировать общину' };
  }

  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) raw[k] = v;
  const parsed = updateCommunitySchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }

  const client = await hasuraAsCurrentUser({ role });
  try {
    await client.request(UPDATE_COMMUNITY, {
      id: session.hasura.community_id,
      set: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        denomination: parsed.data.denomination ?? null,
        founded_year: parsed.data.founded_year ?? null,
        address: parsed.data.address ?? null,
        hero_image_url: parsed.data.hero_image_url ?? null,
        contact_phone: parsed.data.contact_phone ?? null,
        contact_email: parsed.data.contact_email ?? null,
        website_url: parsed.data.website_url ?? null,
        whatsapp_url: parsed.data.whatsapp_url ?? null,
        instagram_url: parsed.data.instagram_url ?? null,
      },
    });
    revalidatePath('/dashboard/community');
    redirect('/dashboard/community');
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка', values: formValues(formData) };
  }
}
