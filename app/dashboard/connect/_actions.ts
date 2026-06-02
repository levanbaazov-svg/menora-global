'use server';

// Interest-groups server actions.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { createGroupSchema, updateGroupSchema, groupIdSchema } from '@/lib/groups/schema';
import { type ActionState, formValues, zodErrorsToMap } from '@/lib/onboarding/action-state';

// ── GraphQL ──────────────────────────────────────────────────────────────────
const INSERT_GROUP = /* GraphQL */ `
  mutation InsertGroup($obj: interest_groups_insert_input!) {
    insert_interest_groups_one(object: $obj) { id }
  }
`;

const UPDATE_GROUP = /* GraphQL */ `
  mutation UpdateGroup($id: uuid!, $set: interest_groups_set_input!) {
    update_interest_groups_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

const GROUP_OWNER = /* GraphQL */ `
  query GroupOwner($id: uuid!) {
    interest_groups_by_pk(id: $id) { id created_by_user_id }
  }
`;

const ARCHIVE_GROUP = /* GraphQL */ `
  mutation ArchiveGroup($id: uuid!) {
    update_interest_groups_by_pk(
      pk_columns: { id: $id }
      _set: { archived_at: "now()" }
    ) { id }
  }
`;

// 2-step join: try to reactivate an existing (possibly-left) membership first;
// if no row was affected, insert a fresh one. Avoids needing `left_at` in
// member's insert column allowlist.
const REJOIN_GROUP = /* GraphQL */ `
  mutation RejoinGroup($group_id: uuid!, $user_id: uuid!) {
    update_group_memberships(
      where: {
        group_id: { _eq: $group_id }
        user_id: { _eq: $user_id }
      }
      _set: { left_at: null }
    ) { affected_rows }
  }
`;

const INSERT_MEMBERSHIP = /* GraphQL */ `
  mutation InsertMembership($group_id: uuid!) {
    insert_group_memberships_one(object: { group_id: $group_id }) { id }
  }
`;

const LEAVE_GROUP = /* GraphQL */ `
  mutation LeaveGroup($group_id: uuid!, $user_id: uuid!) {
    update_group_memberships(
      where: {
        group_id: { _eq: $group_id }
        user_id: { _eq: $user_id }
      }
      _set: { left_at: "now()" }
    ) { affected_rows }
  }
`;

// ── Helpers ──────────────────────────────────────────────────────────────────
function formObject(fd: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k === 'tags') continue;
    obj[k] = v;
  }
  const tags = fd.getAll('tags');
  if (tags.length > 0) obj.tags = tags;
  return obj;
}

async function requireAuth(): Promise<{
  userId: string; communityId: string; role: string; isStaff: boolean;
}> {
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

// ── Create group ────────────────────────────────────────────────────────────
export async function createGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, communityId, role } = await requireAuth();

  const parsed = createGroupSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }

  const client = await hasuraAsCurrentUser({ role });
  try {
    // tags: convert to PG literal `{tag1,tag2}` so Hasura accepts as text[]
    const tagsLiteral = `{${(parsed.data.tags ?? [])
      .map((t) => `"${t.replace(/"/g, '\\"')}"`)
      .join(',')}}`;

    const obj: Record<string, unknown> = {
      community_id: communityId,
      created_by_user_id: userId,
      category: parsed.data.category,
      name: parsed.data.name,
      description: parsed.data.description,
      photo_url: parsed.data.photo_url,
      visibility: parsed.data.visibility ?? 'community',
      frequency: parsed.data.frequency,
      meeting_location: parsed.data.meeting_location,
      meeting_place_id: parsed.data.meeting_place_id,
      tags: tagsLiteral,
    };

    const r = await client.request<{ insert_interest_groups_one: { id: string } | null }>(
      INSERT_GROUP, { obj },
    );
    const id = r.insert_interest_groups_one?.id;
    if (!id) return { formError: 'Не удалось создать группу', values: formValues(formData) };

    revalidatePath('/dashboard/connect');
    redirect(`/dashboard/connect/${id}`);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка', values: formValues(formData) };
  }
}

// ── Update group (creator or rabbi/admin) ─────────────────────────────────────
export async function updateGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, role, isStaff } = await requireAuth();

  const parsed = updateGroupSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }

  const client = await hasuraAsCurrentUser({ role });
  try {
    // Guard: only the group creator OR rabbi/admin may edit.
    const owner = await client.request<{
      interest_groups_by_pk: { id: string; created_by_user_id: string | null } | null;
    }>(GROUP_OWNER, { id: parsed.data.group_id });
    const g = owner.interest_groups_by_pk;
    if (!g) return { formError: 'Группа не найдена', values: formValues(formData) };
    if (!isStaff && g.created_by_user_id !== userId) {
      return { formError: 'Нет прав на редактирование', values: formValues(formData) };
    }

    // tags: convert to PG literal `{tag1,tag2}` so Hasura accepts as text[]
    const tagsLiteral = `{${(parsed.data.tags ?? [])
      .map((t) => `"${t.replace(/"/g, '\\"')}"`)
      .join(',')}}`;

    const set: Record<string, unknown> = {
      category: parsed.data.category,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      photo_url: parsed.data.photo_url ?? null,
      visibility: parsed.data.visibility ?? 'community',
      frequency: parsed.data.frequency ?? null,
      meeting_location: parsed.data.meeting_location ?? null,
      tags: tagsLiteral,
    };

    await client.request(UPDATE_GROUP, { id: parsed.data.group_id, set });

    revalidatePath('/dashboard/connect');
    revalidatePath(`/dashboard/connect/${parsed.data.group_id}`);
    redirect(`/dashboard/connect/${parsed.data.group_id}`);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка', values: formValues(formData) };
  }
}

// ── Join / leave ────────────────────────────────────────────────────────────
export async function joinGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, role } = await requireAuth();
  const parsed = groupIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };

  const client = await hasuraAsCurrentUser({ role });
  try {
    // Step 1: try to reactivate an existing (possibly-left) membership.
    const rejoin = await client.request<{
      update_group_memberships: { affected_rows: number };
    }>(REJOIN_GROUP, { group_id: parsed.data.group_id, user_id: userId });

    // Step 2: if nothing was updated, this is a first-time join — insert.
    if (rejoin.update_group_memberships.affected_rows === 0) {
      await client.request(INSERT_MEMBERSHIP, { group_id: parsed.data.group_id });
    }

    revalidatePath('/dashboard/connect');
    revalidatePath(`/dashboard/connect/${parsed.data.group_id}`);
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

export async function leaveGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, role } = await requireAuth();
  const parsed = groupIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };

  const client = await hasuraAsCurrentUser({ role });
  try {
    await client.request(LEAVE_GROUP, {
      group_id: parsed.data.group_id,
      user_id: userId,
    });
    revalidatePath('/dashboard/connect');
    revalidatePath(`/dashboard/connect/${parsed.data.group_id}`);
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

// ── Archive (admin/creator) ─────────────────────────────────────────────────
export async function archiveGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { role } = await requireAuth();
  const parsed = groupIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };

  const client = await hasuraAsCurrentUser({ role });
  try {
    await client.request(ARCHIVE_GROUP, { id: parsed.data.group_id });
    revalidatePath('/dashboard/connect');
    redirect('/dashboard/connect');
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}
