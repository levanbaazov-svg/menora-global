import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';
import { LOCALE_BCP47, type Locale } from '@/i18n/config';

const FETCH = /* GraphQL */ `
  query AllNotifications($user_id: uuid!) {
    notifications(
      where: { recipient_user_id: { _eq: $user_id } }
      order_by: { created_at: desc }
      limit: 100
    ) {
      id type title body link read_at created_at
      actor { id name image_url }
    }
  }
`;

interface N {
  id: string; type: string; title: string; body: string | null; link: string | null;
  read_at: string | null; created_at: string;
  actor: { id: string; name: string | null; image_url: string | null } | null;
}

function fmt(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(LOCALE_BCP47[locale], {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const { notifications } = await hasuraAdmin.request<{ notifications: N[] }>(
    FETCH, { user_id: session.user.id },
  );
  const t = await getTranslations('notifications');
  const locale = (await getLocale()) as Locale;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/dashboard" className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block">
        {t('back')}
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-6">{t('title')}</h1>

      {notifications.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center text-(--color-fg-muted)">
          {t('empty')}
        </div>
      ) : (
        <ul className="border rounded-xl divide-y overflow-hidden">
          {notifications.map((n) => {
            const Comp = n.link ? Link : 'div';
            return (
              <li key={n.id}>
                <Comp
                  href={n.link ?? '#'}
                  className={`block px-5 py-4 hover:bg-(--color-muted-bg) ${n.read_at ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {!n.read_at && <span className="mt-2 w-2 h-2 rounded-full bg-(--color-gold) shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{n.title}</div>
                      {n.body && (
                        <div className="text-sm text-(--color-fg-muted) mt-0.5">{n.body}</div>
                      )}
                      <div className="text-xs text-(--color-fg-muted) mt-1">
                        {n.actor?.name && `${n.actor.name} · `}{fmt(n.created_at, locale)}
                      </div>
                    </div>
                  </div>
                </Comp>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
