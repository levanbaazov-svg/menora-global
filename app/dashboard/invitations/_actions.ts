'use server';

// Rabbi/admin server actions: create invitation, revoke invitation.

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { generateInviteToken, hashInviteToken, inviteUrl } from '@/lib/invitations/server';
import { createInvitationSchema } from '@/lib/invitations/schema';
import { type ActionState, formValues, zodErrorsToMap } from '@/lib/onboarding/action-state';

const INSERT_INVITATION = /* GraphQL */ `
  mutation InsertInvitation(
    $community_id: uuid!, $email: citext!, $role: membership_role!,
    $token_hash: String!, $expires_at: timestamptz!, $message: String, $invited_by: uuid!
  ) {
    insert_invitations_one(object: {
      community_id: $community_id, email: $email, role: $role,
      token_hash: $token_hash, expires_at: $expires_at,
      message: $message, invited_by: $invited_by
    }) { id expires_at }
  }
`;

const REVOKE_INVITATION = /* GraphQL */ `
  mutation RevokeInvitation($id: uuid!, $user_id: uuid!) {
    update_invitations_by_pk(
      pk_columns: { id: $id }
      _set: { revoked_at: "now()", revoked_by: $user_id }
    ) { id }
  }
`;

const AUDIT = /* GraphQL */ `
  mutation Audit($actor: uuid!, $community: uuid!, $action: String!, $resource_id: uuid!, $metadata: jsonb!) {
    insert_audit_log_one(object: {
      actor_user_id: $actor, community_id: $community,
      action: $action, resource_type: "invitations",
      resource_id: $resource_id, metadata: $metadata
    }) { id }
  }
`;

function formObject(fd: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) obj[k] = v;
  return obj;
}

// On success, returns the freshly-generated plaintext token + url in `values`
// so the form can display the copy-link UI. We never store plaintext.
export async function createInvitation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  if (session.hasura.default_role !== 'rabbi' && session.hasura.default_role !== 'admin') {
    return { formError: 'Только rabbi/admin могут создавать приглашения' };
  }

  const parsed = createInvitationSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + parsed.data.ttl_days * 86400_000).toISOString();
  const communityId = session.hasura.community_id;

  try {
    const r = await hasuraAdmin.request<{ insert_invitations_one: { id: string; expires_at: string } | null }>(
      INSERT_INVITATION,
      {
        community_id: communityId,
        email: parsed.data.email,
        role: parsed.data.role,
        token_hash: tokenHash,
        expires_at: expiresAt,
        message: parsed.data.message ?? null,
        invited_by: session.user.id,
      },
    );
    const inviteId = r.insert_invitations_one?.id;
    if (!inviteId) return { formError: 'Не удалось создать приглашение' };

    await hasuraAdmin.request(AUDIT, {
      actor: session.user.id,
      community: communityId,
      action: 'invitation.created',
      resource_id: inviteId,
      metadata: { email: parsed.data.email, role: parsed.data.role, ttl_days: parsed.data.ttl_days },
    });

    revalidatePath('/dashboard/invitations');
    return {
      ok: true,
      values: {
        token,
        url: inviteUrl(token),
        email: parsed.data.email,
        role: parsed.data.role,
        expires_at: expiresAt,
        invitation_id: inviteId,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ошибка БД';
    return { formError: `Hasura: ${msg}`, values: formValues(formData) };
  }
}

export async function revokeInvitation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  if (session.hasura.default_role !== 'rabbi' && session.hasura.default_role !== 'admin') {
    return { formError: 'Только rabbi/admin могут отзывать приглашения' };
  }

  const id = String(formData.get('id') ?? '');
  if (!id) return { formError: 'Не указан ID' };

  try {
    await hasuraAdmin.request(REVOKE_INVITATION, { id, user_id: session.user.id });
    await hasuraAdmin.request(AUDIT, {
      actor: session.user.id,
      community: session.hasura.community_id,
      action: 'invitation.revoked',
      resource_id: id,
      metadata: {},
    });
    revalidatePath('/dashboard/invitations');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}
