// POST /api/invitations/accept { token }
//
// Validates an invitation token (matched against token_hash), creates an
// active membership, and records audit. Caller must be authenticated.

import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';

const BodySchema = z.object({
  token: z.string().min(16).max(256),
});

const FIND_INVITATION = /* GraphQL */ `
  query FindInvitation($token_hash: String!) {
    invitations(
      where: {
        token_hash: { _eq: $token_hash }
        accepted_at: { _is_null: true }
        revoked_at: { _is_null: true }
        expires_at: { _gt: "now()" }
      }
      limit: 1
    ) { id community_id role email }
  }
`;

const ACCEPT_INVITATION = /* GraphQL */ `
  mutation AcceptInvitation(
    $invitation_id: uuid!, $user_id: uuid!,
    $community_id: uuid!, $role: membership_role!
  ) {
    insert_memberships_one(
      object: {
        user_id: $user_id, community_id: $community_id,
        role: $role, status: active, entry_method: invite,
        joined_at: "now()"
      }
      on_conflict: {
        constraint: memberships_user_community_unique
        update_columns: [status, role, joined_at, entry_method]
      }
    ) { id }

    update_invitations_by_pk(
      pk_columns: { id: $invitation_id }
      _set: { accepted_at: "now()", accepted_by: $user_id }
    ) { id }

    insert_audit_log_one(object: {
      actor_user_id: $user_id, community_id: $community_id,
      action: "invitation.accepted",
      resource_type: "invitations", resource_id: $invitation_id,
      metadata: {}
    }) { id }
  }
`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', detail: parsed.error.format() }, { status: 400 });
  }

  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');

  const found = await hasuraAdmin.request<{
    invitations: Array<{ id: string; community_id: string; role: 'member' | 'rabbi' | 'admin'; email: string }>;
  }>(FIND_INVITATION, { token_hash: tokenHash });

  const invite = found.invitations[0];
  if (!invite) {
    return NextResponse.json({ error: 'invitation_invalid_or_expired' }, { status: 410 });
  }

  await hasuraAdmin.request(ACCEPT_INVITATION, {
    invitation_id: invite.id,
    user_id: session.user.id,
    community_id: invite.community_id,
    role: invite.role,
  });

  return NextResponse.json({
    ok: true,
    community_id: invite.community_id,
    role: invite.role,
    note: 'Sign out and back in to refresh your JWT roles.',
  });
}
