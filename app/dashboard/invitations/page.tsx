import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { LOCALE_BCP47, type Locale } from '@/i18n/config';
import { RevokeButton } from './RevokeButton';

type T = Awaited<ReturnType<typeof getTranslations<'directory'>>>;

const LIST_INVITATIONS = /* GraphQL */ `
  query ListInvitations($community_id: uuid!) {
    invitations(
      where: { community_id: { _eq: $community_id } }
      order_by: { created_at: desc }
    ) {
      id email role expires_at accepted_at revoked_at created_at
      inviter { id name }
      acceptor { id name email }
    }
  }
`;

interface Invitation {
  id: string; email: string; role: 'member' | 'rabbi' | 'admin';
  expires_at: string; accepted_at: string | null; revoked_at: string | null; created_at: string;
  inviter: { id: string; name: string | null } | null;
  acceptor: { id: string; name: string | null; email: string } | null;
}

function statusOf(inv: Invitation, t: T): { label: string; cls: string } {
  if (inv.accepted_at) return { label: t('invitations.status.accepted'), cls: 'bg-green-100 text-green-800' };
  if (inv.revoked_at)  return { label: t('invitations.status.revoked'), cls: 'bg-gray-100 text-gray-600' };
  if (new Date(inv.expires_at) < new Date()) return { label: t('invitations.status.expired'), cls: 'bg-orange-100 text-orange-800' };
  return { label: t('invitations.status.pending'), cls: 'bg-(--color-gold-soft) text-(--color-gold-dark)' };
}

function fmt(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(LOCALE_BCP47[locale], { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function InvitationsListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const t = await getTranslations('directory');
  const locale = (await getLocale()) as Locale;

  const role = session.hasura.default_role;
  const client = await hasuraAsCurrentUser({ role });
  const { invitations } = await client.request<{ invitations: Invitation[] }>(
    LIST_INVITATIONS, { community_id: session.hasura.community_id },
  );

  return (
    <div className="container mx-auto max-w-2xl px-4 md:px-6 pt-3 pb-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl font-semibold leading-tight tracking-tight mb-1">{t('invitations.title')}</h1>
          <p className="text-sm text-(--color-fg-muted)">
            {t('invitations.count', { count: invitations.length })}
          </p>
        </div>
        <Link
          href="/dashboard/invitations/new"
          className="px-5 py-2.5 rounded-full bg-(--color-deep) text-white text-sm font-semibold hover:opacity-90"
        >
          {t('invitations.invite')}
        </Link>
      </div>

      {invitations.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <p className="text-(--color-fg-muted) mb-4">{t('invitations.emptyText')}</p>
          <Link
            href="/dashboard/invitations/new"
            className="px-5 py-2.5 rounded-full bg-(--color-gold) text-(--color-deep) text-sm font-semibold hover:scale-105 inline-block transition-transform"
          >
            {t('invitations.emptyCta')}
          </Link>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-(--color-muted-bg) text-(--color-fg-muted)">
              <tr>
                <th className="text-left px-4 py-3 font-medium">{t('invitations.thEmail')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('invitations.thRole')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('invitations.thStatus')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('invitations.thExpires')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('invitations.thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => {
                const s = statusOf(inv, t);
                const pending = !inv.accepted_at && !inv.revoked_at && new Date(inv.expires_at) > new Date();
                return (
                  <tr key={inv.id} className="border-t">
                    <td className="px-4 py-3">
                      <div>{inv.email}</div>
                      {inv.acceptor && (
                        <div className="text-xs text-(--color-fg-muted) mt-0.5">
                          → {inv.acceptor.name ?? inv.acceptor.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{inv.role}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-(--color-fg-muted)">{fmt(inv.expires_at, locale)}</td>
                    <td className="px-4 py-3 text-right">
                      {pending && <RevokeButton id={inv.id} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
