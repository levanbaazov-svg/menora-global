'use server';

// Places + programs server actions.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser, hasuraAdmin } from '@/lib/hasura';
import {
  createPlaceSchema, updatePlaceSchema, placeIdSchema, approvePlaceSchema, rejectPlaceSchema,
  createProgramSchema, updateProgramSchema, programIdSchema, enrollProgramSchema,
} from '@/lib/places/schema';
import { createCommunitySchema } from '@/lib/community/schema';
import { isPlatformAdmin } from '@/lib/auth/platform';
import { newJoinMembership } from '@/lib/demo';
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

const UPDATE_PLACE = /* GraphQL */ `
  mutation UpdatePlace($id: uuid!, $set: places_set_input!) {
    update_places_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

const INSERT_PROGRAM = /* GraphQL */ `
  mutation InsertProgram($obj: programs_insert_input!) {
    insert_programs_one(object: $obj) { id }
  }
`;

const UPDATE_PROGRAM = /* GraphQL */ `
  mutation UpdateProgram($id: uuid!, $set: programs_set_input!) {
    update_programs_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

const ARCHIVE_PROGRAM = /* GraphQL */ `
  mutation ArchiveProgram($id: uuid!) {
    update_programs_by_pk(pk_columns: { id: $id }, _set: { status: archived }) { id }
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

// ── Join another community (in-app, post-onboarding) ───────────────────────
const CHECK_MEMBERSHIP = /* GraphQL */ `
  query CheckMembership($user_id: uuid!, $community_id: uuid!) {
    memberships(where: { user_id: { _eq: $user_id }, community_id: { _eq: $community_id } }, limit: 1) {
      id status
    }
  }
`;

// status/role inlined from the demo switch (enums can't be plain variables).
const joinRequestMutation = (status: string, role: string) => /* GraphQL */ `
  mutation JoinRequest($user_id: uuid!, $community_id: uuid!, $message: String!) {
    insert_memberships_one(object: {
      user_id: $user_id, community_id: $community_id,
      entry_method: self_request, status: ${status}, role: ${role}, request_message: $message
    }) { id }
  }
`;

/**
 * Lets an already-onboarded member request to join an ADDITIONAL community
 * (e.g. lives in Vienna + Miami) without re-running onboarding. Creates a
 * pending membership the community's rabbi then approves.
 */
export async function requestJoinCommunity(
  communityId: string,
  message = '',
): Promise<{ ok: boolean; error?: string; status?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Не авторизован' };

  try {
    const existing = await hasuraAdmin.request<{ memberships: Array<{ id: string; status: string }> }>(
      CHECK_MEMBERSHIP, { user_id: session.user.id, community_id: communityId },
    );
    const m = existing.memberships[0];
    if (m) {
      if (m.status === 'pending') return { ok: true, status: 'pending' };
      if (m.status === 'active') return { ok: true, status: 'active' };
      // rejected/left/suspended → allow re-request by updating below isn't trivial; report
      return { ok: false, error: 'Заявка уже обрабатывалась', status: m.status };
    }
    const { status, role } = newJoinMembership();
    await hasuraAdmin.request(joinRequestMutation(status, role), {
      user_id: session.user.id, community_id: communityId, message: message.slice(0, 500),
    });
    revalidatePath('/dashboard/community', 'layout');
    return { ok: true, status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Ошибка' };
  }
}

// ── Edit place ─────────────────────────────────────────────────────────────
export async function updatePlace(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { role, isStaff } = await requireAuth();
  if (!isStaff) return { formError: 'Только rabbi/admin может редактировать места' };
  const parsed = updatePlaceSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }
  const { place_id, ...set } = parsed.data;
  const client = await hasuraAsCurrentUser({ role });
  try {
    await client.request(UPDATE_PLACE, { id: place_id, set });
    revalidatePath('/dashboard/community');
    redirect(`/dashboard/community/places/${place_id}`);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка', values: formValues(formData) };
  }
}

// ── Edit / archive program ─────────────────────────────────────────────────
export async function updateProgram(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { role, isStaff } = await requireAuth();
  if (!isStaff) return { formError: 'Только rabbi/admin может редактировать программы' };
  const parsed = updateProgramSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }
  const { program_id, ...set } = parsed.data;
  const client = await hasuraAsCurrentUser({ role });
  try {
    await client.request(UPDATE_PROGRAM, { id: program_id, set });
    revalidatePath('/dashboard/community');
    redirect(`/dashboard/community/programs/${program_id}`);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка', values: formValues(formData) };
  }
}

export async function archiveProgram(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { role, isStaff } = await requireAuth();
  if (!isStaff) return { formError: 'Только rabbi/admin' };
  const parsed = programIdSchema.safeParse(formObject(formData));
  if (!parsed.success) return { formError: 'Неверный id' };
  const client = await hasuraAsCurrentUser({ role });
  try {
    await client.request(ARCHIVE_PROGRAM, { id: parsed.data.program_id });
    revalidatePath('/dashboard/community');
    redirect('/dashboard/community');
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

// ── Create a new community (rabbi starts their Beit Chabad) ─────────────────
const INSERT_COMMUNITY = /* GraphQL */ `
  mutation InsertCommunity($obj: communities_insert_input!) {
    insert_communities_one(object: $obj) { id slug }
  }
`;
const INSERT_RABBI_MEMBERSHIP = /* GraphQL */ `
  mutation InsertRabbiMembership($obj: memberships_insert_input!) {
    insert_memberships_one(object: $obj) { id }
  }
`;

function slugify(name: string): string {
  const base = name.toLowerCase()
    .replace(/[^a-z0-9Ѐ-ӿ\s-]/g, '')
    .trim().replace(/\s+/g, '-').slice(0, 50) || 'community';
  // de-cyrillic-ify minimally so slugs stay URL-clean; fall back to a suffix
  return base.replace(/[Ѐ-ӿ]+/g, 'c');
}

/**
 * Creates a community and makes the creator its rabbi (active). Any authenticated
 * user can start one — the platform can later vet/feature it. Returns to the new
 * community so the rabbi can immediately add programs/places/events.
 */
export async function createCommunity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { formError: 'Не авторизован' };

  const parsed = createCommunitySchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }

  // Moderation: platform admins create live communities; everyone else submits
  // a request that stays hidden until the platform team approves it (we verify
  // the rabbi & community are real).
  const platformAdmin = await isPlatformAdmin(session.user.id);
  const approvalStatus = platformAdmin ? 'approved' : 'pending';
  const isPublic = platformAdmin;

  const slug = `${slugify(parsed.data.name)}-${Math.abs(hashCode(session.user.id + parsed.data.name)).toString(36).slice(0, 4)}`;
  try {
    // Use admin client: the creator has no membership in this community yet, so
    // RLS would block a scoped insert. Server-validated, safe.
    const r = await hasuraAdmin.request<{ insert_communities_one: { id: string; slug: string } | null }>(
      INSERT_COMMUNITY,
      {
        obj: {
          slug,
          name: parsed.data.name,
          city: parsed.data.city,
          country_code: parsed.data.country_code.toUpperCase(),
          timezone: parsed.data.timezone,
          denomination: parsed.data.denomination ?? 'Chabad',
          description: parsed.data.description ?? null,
          address: parsed.data.address ?? null,
          hero_image_url: parsed.data.hero_image_url ?? null,
          contact_phone: parsed.data.contact_phone ?? null,
          contact_email: parsed.data.contact_email ?? null,
          website_url: parsed.data.website_url ?? null,
          whatsapp_url: parsed.data.whatsapp_url ?? null,
          instagram_url: parsed.data.instagram_url ?? null,
          founded_year: parsed.data.founded_year ?? null,
          is_public: isPublic,
          approval_status: approvalStatus,
        },
      },
    );
    const community = r.insert_communities_one;
    if (!community) return { formError: 'Не удалось создать общину', values: formValues(formData) };

    await hasuraAdmin.request(INSERT_RABBI_MEMBERSHIP, {
      obj: {
        user_id: session.user.id,
        community_id: community.id,
        role: 'rabbi',
        status: 'active',
        entry_method: 'rabbi_added',
        joined_at: 'now()',
      },
    });

    revalidatePath('/dashboard/community', 'layout');
    redirect(`/dashboard/community/c/${community.slug}?created=1`);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    return { formError: e instanceof Error ? e.message : 'Ошибка', values: formValues(formData) };
  }
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}

// ── Platform moderation of pending communities ─────────────────────────────
const SET_COMMUNITY_APPROVAL = /* GraphQL */ `
  mutation SetCommunityApproval($id: uuid!, $status: String!, $public: Boolean!) {
    update_communities_by_pk(pk_columns: { id: $id }, _set: { approval_status: $status, is_public: $public }) { id }
  }
`;

async function moderateCommunity(formData: FormData, status: 'approved' | 'rejected'): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Не авторизован' };
  if (!(await isPlatformAdmin(session.user.id))) return { ok: false, error: 'Только платформенный админ' };
  const id = String(formData.get('community_id') ?? '');
  if (!id) return { ok: false, error: 'Неверный id' };
  try {
    await hasuraAdmin.request(SET_COMMUNITY_APPROVAL, { id, status, public: status === 'approved' });
    revalidatePath('/dashboard/admin/communities');
    revalidatePath('/dashboard/community/discover');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Ошибка' };
  }
}

export async function approveCommunity(formData: FormData) { return moderateCommunity(formData, 'approved'); }
export async function rejectCommunity(formData: FormData) { return moderateCommunity(formData, 'rejected'); }
