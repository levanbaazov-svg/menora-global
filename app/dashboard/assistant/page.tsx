// /dashboard/assistant — rabbi-only voice-first CRM assistant.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { AssistantChat } from './AssistantChat';

const FETCH = /* GraphQL */ `
  query AssistantContext($user_id: uuid!) {
    users_by_pk(id: $user_id) {
      id name ical_subscription_token
    }
    memberships(
      where: { user_id: { _eq: $user_id }, status: { _eq: active } }
      limit: 1
    ) {
      role
      community { id name }
    }
  }
`;

const STARTERS = [
  'Сколько у нас активных участников?',
  'У кого день рождения на этой неделе?',
  'Покажи мои открытые задачи',
  'Какие события на этой неделе?',
  'Какие просьбы участники сейчас оставили?',
];

export default async function AssistantPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const role = session.hasura.default_role;
  if (role !== 'rabbi' && role !== 'admin') redirect('/dashboard');

  const data = await hasuraAdmin.request<{
    users_by_pk: { id: string; name: string | null; ical_subscription_token: string } | null;
    memberships: Array<{ role: string; community: { id: string; name: string } | null }>;
  }>(FETCH, { user_id: session.user.id });

  const user = data.users_by_pk;
  const community = data.memberships[0]?.community;
  if (!user || !community) {
    return <div className="p-10 text-center">Нет активной общины.</div>;
  }

  const h = await headers();
  const host = h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = host ? `${proto}://${host}` : (process.env.NEXTAUTH_URL ?? '');
  const icalUrl = `${origin}/api/ical/${user.ical_subscription_token}`;

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-6 pt-3 pb-6">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-(--color-gold-dark) font-semibold">
            ✦ Ассистент раввина
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight mt-1">
            {community.name}
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-(--color-fg-muted) hover:text-(--color-deep) transition-colors whitespace-nowrap mt-1"
        >
          ← Главная
        </Link>
      </header>

      {/* ICS subscription link */}
      <details className="mb-3 rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 px-4 py-2.5 text-xs">
        <summary className="cursor-pointer text-(--color-fg-muted) hover:text-(--color-deep) transition-colors flex items-center gap-2">
          <span>🗓</span>
          <span>Подписать свой календарь на задачи и события</span>
        </summary>
        <div className="mt-2 space-y-2">
          <p className="text-(--color-fg-muted) leading-relaxed">
            Скопируй ссылку и добавь как новый календарь в Apple Calendar / Google Calendar / Outlook —
            твои задачи и события общины появятся там автоматически и будут обновляться.
          </p>
          <div className="rounded-xl bg-(--color-bg-muted) px-3 py-2 break-all font-mono text-[10px]">
            {icalUrl}
          </div>
          <div className="flex gap-2 flex-wrap">
            <a
              href={icalUrl.replace(/^https?:/, 'webcal:')}
              className="inline-block px-3 py-1 rounded-full bg-(--color-deep) text-white font-medium hover:opacity-90 text-[11px]"
            >
              Открыть в Календаре
            </a>
            <a
              href={`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(icalUrl)}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-block px-3 py-1 rounded-full border border-(--color-border) text-(--color-fg) hover:border-(--color-gold)/40 text-[11px]"
            >
              Google Calendar
            </a>
          </div>
        </div>
      </details>

      <AssistantChat
        rabbiName={user.name}
        communityName={community.name}
        starterPrompts={STARTERS}
      />
    </div>
  );
}
