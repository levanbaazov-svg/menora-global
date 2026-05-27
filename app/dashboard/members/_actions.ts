'use server';

// Rabbi/admin member-management actions. Runs as the user's role (rabbi or
// admin), so Hasura row-filter enforces "only your own community" implicitly.

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser, hasuraAdmin } from '@/lib/hasura';
import { notify } from '@/lib/notifications/create';
import {
  approveSchema, rejectSchema, changeRoleSchema, suspendSchema, unsuspendSchema,
} from '@/lib/members/schema';
import { type ActionState, zodErrorsToMap } from '@/lib/onboarding/action-state';

const APPROVE = /* GraphQL */ `
  mutation Approve($id: uuid!, $approver: uuid!) {
    update_memberships_by_pk(
      pk_columns: { id: $id }
      _set: { status: active, joined_at: "now()", approved_by: $approver }
    ) { id user_id community_id role }
  }
`;

const REJECT = /* GraphQL */ `
  mutation Reject($id: uuid!, $rejecter: uuid!, $reason: String!) {
    update_memberships_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: rejected, rejected_at: "now()",
        rejected_by: $rejecter, rejected_reason: $reason
      }
    ) { id user_id community_id }
  }
`;

const CHANGE_ROLE = /* GraphQL */ `
  mutation ChangeRole($id: uuid!, $role: membership_role!) {
    update_memberships_by_pk(pk_columns: { id: $id }, _set: { role: $role }) {
      id role
    }
  }
`;

const SUSPEND = /* GraphQL */ `
  mutation Suspend($id: uuid!) {
    update_memberships_by_pk(pk_columns: { id: $id }, _set: { status: suspended, suspended_at: "now()" }) {
      id status
    }
  }
`;

const UNSUSPEND = /* GraphQL */ `
  mutation Unsuspend($id: uuid!) {
    update_memberships_by_pk(pk_columns: { id: $id }, _set: { status: active, suspended_at: null }) {
      id status
    }
  }
`;

const AUDIT = /* GraphQL */ `
  mutation Audit($actor: uuid!, $community: uuid!, $action: String!, $resource_id: uuid!, $metadata: jsonb!) {
    insert_audit_log_one(object: {
      actor_user_id: $actor, community_id: $community,
      action: $action, resource_type: "memberships",
      resource_id: $resource_id, metadata: $metadata
    }) { id }
  }
`;

async function requireRabbi(): Promise<{ userId: string; communityId: string; role: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  const role = session.hasura.default_role;
  if (role !== 'rabbi' && role !== 'admin') throw new Error('Forbidden');
  return { userId: session.user.id, communityId: session.hasura.community_id, role };
}

function formObject(fd: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) obj[k] = v;
  return obj;
}

async function audit(actor: string, community: string, action: string, resourceId: string, metadata: Record<string, unknown> = {}) {
  // Audit through admin secret — audit_log has no member-role insert perm.
  await hasuraAdmin.request(AUDIT, { actor, community, action, resource_id: resourceId, metadata });
}

const MEMBERSHIP_USER = /* GraphQL */ `
  query MembershipUser($id: uuid!) {
    memberships_by_pk(id: $id) { user_id community { id name } }
  }
`;

async function notifyApplicant(membershipId: string, actor: string, type: 'membership_approved' | 'membership_rejected', extra?: string) {
  const data = await hasuraAdmin.request<{
    memberships_by_pk: { user_id: string; community: { id: string; name: string } | null } | null;
  }>(MEMBERSHIP_USER, { id: membershipId });
  const m = data.memberships_by_pk;
  if (!m) return;
  const titleBase = type === 'membership_approved'
    ? `Заявка в «${m.community?.name ?? 'общину'}» одобрена`
    : `Заявка в «${m.community?.name ?? 'общину'}» отклонена`;
  await notify({
    recipient_user_id: m.user_id,
    actor_user_id: actor,
    community_id: m.community?.id,
    type,
    title: titleBase,
    body: extra ?? null,
    resource_type: 'memberships', resource_id: membershipId,
    link: '/dashboard',
  });
}

export async function approveMembership(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, communityId, role } = await requireRabbi();
  const parsed = approveSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };
  try {
    const client = await hasuraAsCurrentUser({ role });
    await client.request(APPROVE, { id: parsed.data.membership_id, approver: userId });
    await audit(userId, communityId, 'membership.approved', parsed.data.membership_id);
    await notifyApplicant(parsed.data.membership_id, userId, 'membership_approved');
    revalidatePath('/dashboard/members');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

export async function rejectMembership(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, communityId, role } = await requireRabbi();
  const parsed = rejectSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };
  try {
    const client = await hasuraAsCurrentUser({ role });
    await client.request(REJECT, {
      id: parsed.data.membership_id, rejecter: userId, reason: parsed.data.reason,
    });
    await audit(userId, communityId, 'membership.rejected', parsed.data.membership_id, { reason: parsed.data.reason });
    await notifyApplicant(parsed.data.membership_id, userId, 'membership_rejected', parsed.data.reason);
    revalidatePath('/dashboard/members');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

export async function changeMemberRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, communityId, role } = await requireRabbi();
  const parsed = changeRoleSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };
  try {
    const client = await hasuraAsCurrentUser({ role });
    await client.request(CHANGE_ROLE, { id: parsed.data.membership_id, role: parsed.data.role });
    await audit(userId, communityId, 'membership.role_changed', parsed.data.membership_id, { role: parsed.data.role });
    revalidatePath('/dashboard/members');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

export async function suspendMembership(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, communityId, role } = await requireRabbi();
  const parsed = suspendSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };
  try {
    const client = await hasuraAsCurrentUser({ role });
    await client.request(SUSPEND, { id: parsed.data.membership_id });
    await audit(userId, communityId, 'membership.suspended', parsed.data.membership_id);
    revalidatePath('/dashboard/members');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

export async function unsuspendMembership(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, communityId, role } = await requireRabbi();
  const parsed = unsuspendSchema.safeParse(formObject(formData));
  if (!parsed.success) return { errors: zodErrorsToMap(parsed.error) };
  try {
    const client = await hasuraAsCurrentUser({ role });
    await client.request(UNSUSPEND, { id: parsed.data.membership_id });
    await audit(userId, communityId, 'membership.unsuspended', parsed.data.membership_id);
    revalidatePath('/dashboard/members');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}
