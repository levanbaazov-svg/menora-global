// Public invite-accept page. URL: /invite?token=<token>
//
// Looks up invitation by token_hash (admin-secret) and shows a preview:
// community name, role, expiry. User clicks Accept → POST /api/invitations/accept.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { hashInviteToken } from '@/lib/invitations/server';
import { getTranslations } from 'next-intl/server';
import { AcceptButton } from './AcceptButton';

type T = Awaited<ReturnType<typeof getTranslations<'directory'>>>;

const FIND_INVITE = /* GraphQL */ `
  query FindInvite($token_hash: String!) {
    invitations(where: { token_hash: { _eq: $token_hash } }, limit: 1) {
      id email role expires_at accepted_at revoked_at message
      community { id name slug city country_code }
      inviter { name }
    }
  }
`;

interface Invitation {
  id: string; email: string; role: string;
  expires_at: string; accepted_at: string | null; revoked_at: string | null;
  message: string | null;
  community: { id: string; name: string; slug: string; city: string | null; country_code: string | null } | null;
  inviter: { name: string | null } | null;
}

function invitationState(inv: Invitation, t: T): { kind: 'ok' | 'accepted' | 'revoked' | 'expired'; label?: string } {
  if (inv.accepted_at) return { kind: 'accepted', label: t('invite.alreadyAccepted') };
  if (inv.revoked_at)  return { kind: 'revoked', label: t('invite.revoked') };
  if (new Date(inv.expires_at) < new Date()) return { kind: 'expired', label: t('invite.expired') };
  return { kind: 'ok' };
}

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getTranslations('directory');
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="font-serif text-3xl mb-2">{t('invite.noTokenTitle')}</h1>
        <p className="text-(--color-fg-muted)">{t.rich('invite.noTokenText', { code: (c) => <code>{c}</code> })}</p>
      </div>
    );
  }

  const tokenHash = hashInviteToken(token);
  const { invitations } = await hasuraAdmin.request<{ invitations: Invitation[] }>(
    FIND_INVITE, { token_hash: tokenHash },
  );
  const inv = invitations[0];
  const session = await auth();

  if (!inv) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-3xl mb-2">{t('invite.notFoundTitle')}</h1>
        <p className="text-(--color-fg-muted) max-w-md">
          {t('invite.notFoundText')}
        </p>
      </div>
    );
  }

  const status = invitationState(inv, t);

  if (status.kind !== 'ok') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-3xl mb-2">{status.label}</h1>
        <p className="text-(--color-fg-muted)">{t('invite.forCommunity', { name: inv.community?.name ?? '—' })}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-sm text-(--color-fg-muted) uppercase tracking-wide">
          {t('invite.invitesYou', { name: inv.inviter?.name ?? t('invite.defaultInviter') })}
        </div>
        <h1 className="font-serif text-4xl font-semibold">
          {inv.community?.name ?? 'Menorah Global'}
        </h1>
        {inv.community?.city && (
          <p className="text-(--color-fg-muted)">
            {[inv.community.city, inv.community.country_code].filter(Boolean).join(', ')}
          </p>
        )}
        <div className="text-sm space-y-1">
          <div>
            <span className="text-(--color-fg-muted)">{t('invite.emailLabel')}</span>{' '}
            <span className="font-medium">{inv.email}</span>
          </div>
          <div>
            <span className="text-(--color-fg-muted)">{t('invite.roleLabel')}</span>{' '}
            <span className="font-medium">{inv.role}</span>
          </div>
        </div>
        {inv.message && (
          <div className="border rounded-lg p-4 text-left text-sm bg-(--color-muted-bg)">
            <div className="text-xs text-(--color-fg-muted) mb-1">{t('invite.messageLabel')}</div>
            <p className="whitespace-pre-wrap">{inv.message}</p>
          </div>
        )}
        <div className="pt-4">
          <AcceptButton token={token} signedIn={!!session?.user} />
        </div>
        {session?.user && session.user.email && session.user.email !== inv.email && (
          <p className="text-xs text-orange-600">
            {t.rich('invite.wrongAccount', {
              current: session.user.email,
              invited: inv.email,
              strong: (c) => <strong>{c}</strong>,
            })}
          </p>
        )}
      </div>
    </div>
  );
}
