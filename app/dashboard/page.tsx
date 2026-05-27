import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { HebrewCalendarCard } from './_HebrewCalendarCard';

const FETCH_DASHBOARD = /* GraphQL */ `
  query Dashboard($user_id: uuid!) {
    user_profiles_by_pk(user_id: $user_id) {
      legal_first_name hebrew_name denomination observance_level
    }
    memberships(where: { user_id: { _eq: $user_id }, status: { _eq: active } }) {
      role
      community { id slug name city country_code timezone }
    }
    pending: memberships_aggregate(where: { user_id: { _eq: $user_id }, status: { _eq: pending } }) {
      aggregate { count }
    }
  }
`;

interface DashboardData {
  user_profiles_by_pk: {
    legal_first_name: string | null; hebrew_name: string | null;
    denomination: string | null; observance_level: string | null;
  } | null;
  memberships: Array<{
    role: 'member' | 'rabbi' | 'admin';
    community: { id: string; slug: string; name: string; city: string | null; country_code: string | null; timezone: string };
  }>;
  pending: { aggregate: { count: number } | null };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const data = await hasuraAdmin.request<DashboardData>(FETCH_DASHBOARD, { user_id: session.user.id });
  const profile = data.user_profiles_by_pk;
  const memberships = data.memberships;
  const pendingCount = data.pending.aggregate?.count ?? 0;
  const greeting = profile?.legal_first_name ?? session.user.name?.split(' ')[0] ?? 'друг';

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="font-serif text-4xl font-semibold mb-2">Шалом, {greeting}</h1>
        <p className="text-(--color-muted)">
          {memberships.length > 0
            ? `Ты в ${memberships.length === 1 ? 'общине' : memberships.length + ' общинах'}`
            : pendingCount > 0
              ? 'Заявка на вступление на рассмотрении'
              : 'Пока не присоединился к общине'}
        </p>
      </div>

      {memberships.length > 0 && (
        <section className="mb-12 grid gap-6 md:grid-cols-[1fr_320px]">
          <div>
            <h2 className="font-serif text-xl font-semibold mb-4">Мои общины</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {memberships.map((m) => (
                <div key={m.community.id} className="border rounded-xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{m.community.name}</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-(--color-muted-bg)">
                      {m.role}
                    </span>
                  </div>
                  {m.community.city && (
                    <p className="text-sm text-(--color-muted)">{m.community.city}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <aside>
            <HebrewCalendarCard community={memberships[0].community} />
          </aside>
        </section>
      )}

      <section className="mb-12">
        <h2 className="font-serif text-xl font-semibold mb-4">Дальше</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <TileLink href="/dashboard/events"   label="События"   hint="Создать / RSVP" />
          <TileLink href="/dashboard/requests" label="Просьбы"  hint="Помоги / попроси" />
          <TileLink href="/dashboard/routines" label="Рутины"   hint="Daily prayer · streaks" />
          <TileLink href="/dashboard/people"   label="Участники" hint="Кто в общине" />
        </div>
      </section>

      {(session.hasura.default_role === 'rabbi' || session.hasura.default_role === 'admin') && (
        <section className="mb-12">
          <h2 className="font-serif text-xl font-semibold mb-4">Управление</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <TileLink href="/dashboard/members"     label="Заявки и доступ" hint="Одобрить · роли · заморозить" />
            <TileLink href="/dashboard/invitations" label="Приглашения"     hint="Пригласить новых членов" />
          </div>
        </section>
      )}

      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold">Мой профиль</h2>
          <Link href="/dashboard/me" className="text-sm text-(--color-muted) hover:text-(--color-deep)">
            Открыть →
          </Link>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 max-w-md text-sm">
          <dt className="text-(--color-muted)">Еврейское имя</dt>
          <dd>{profile?.hebrew_name ?? '—'}</dd>
          <dt className="text-(--color-muted)">Направление</dt>
          <dd>{profile?.denomination ?? '—'}</dd>
          <dt className="text-(--color-muted)">Соблюдение</dt>
          <dd>{profile?.observance_level ?? '—'}</dd>
        </dl>
      </section>
    </div>
  );
}

function Tile({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="border rounded-xl p-5 text-center opacity-60">
      <div className="font-semibold mb-1">{label}</div>
      <div className="text-xs text-(--color-muted)">{hint}</div>
    </div>
  );
}

import Link from 'next/link';
function TileLink({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link
      href={href}
      className="border rounded-xl p-5 text-center hover:border-(--color-gold) hover:bg-(--color-gold-soft) transition-colors block"
    >
      <div className="font-semibold mb-1">{label}</div>
      <div className="text-xs text-(--color-muted)">{hint}</div>
    </Link>
  );
}
