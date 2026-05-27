import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Avatar } from '../../_Avatar';
import {
  displayName, DENOMINATION_LABELS, OBSERVANCE_LABELS, KASHRUT_LABELS,
  INTEREST_LABELS, ROLE_BADGES, type UserDisplay,
} from '@/lib/profile/display';

const FETCH = /* GraphQL */ `
  query FetchPerson($user_id: uuid!, $community_id: uuid!) {
    users_by_pk(id: $user_id) {
      id email name image_url created_at
      profile {
        legal_first_name legal_last_name hebrew_name
        denomination observance_level kashrut_level
        interests bio profile_visibility marital_status has_children
      }
    }
    membership: memberships(
      where: { user_id: { _eq: $user_id }, community_id: { _eq: $community_id }, status: { _eq: active } }
      limit: 1
    ) {
      role joined_at member_since community_role
    }
  }
`;

interface PersonData {
  users_by_pk: (UserDisplay & {
    created_at: string;
    profile: (UserDisplay['profile'] & { marital_status?: string | null; has_children?: boolean | null }) | null;
  }) | null;
  membership: Array<{
    role: 'member' | 'rabbi' | 'admin';
    joined_at: string | null;
    member_since: string | null;
    community_role: string | null;
  }>;
}

function fmt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default async function PersonProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  // Viewing self → redirect to /dashboard/me (richer view)
  if (id === session.user.id) redirect('/dashboard/me');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const data = await client.request<PersonData>(FETCH, {
    user_id: id,
    community_id: session.hasura.community_id,
  });

  const user = data.users_by_pk;
  const membership = data.membership[0];
  if (!user || !membership) notFound();

  const name = displayName(user);
  const p = user.profile;
  const roleBadge = ROLE_BADGES[membership.role];
  const interests = p?.interests ?? [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/dashboard/people" className="text-sm text-(--color-muted) hover:text-(--color-deep) mb-6 inline-block">
        ← К списку участников
      </Link>

      <header className="flex items-start gap-5 mb-8">
        <Avatar user={user} size="xl" />
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-3xl font-semibold mb-1">{name}</h1>
          {p?.hebrew_name && <p className="text-(--color-muted) mb-2">{p.hebrew_name}</p>}
          <div className="flex flex-wrap gap-2">
            {membership.role !== 'member' && (
              <span className={`text-xs px-2 py-1 rounded-full ${roleBadge.cls}`}>
                {roleBadge.label}
              </span>
            )}
            {membership.community_role && (
              <span className="text-xs px-2 py-1 rounded-full border">{membership.community_role}</span>
            )}
          </div>
        </div>
      </header>

      {p?.bio && (
        <section className="mb-8">
          <p className="text-base whitespace-pre-wrap">{p.bio}</p>
        </section>
      )}

      <section className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-8">
        {p?.denomination && (
          <DefRow label="Направление" value={DENOMINATION_LABELS[p.denomination] ?? p.denomination} />
        )}
        {p?.observance_level && (
          <DefRow label="Соблюдение" value={OBSERVANCE_LABELS[p.observance_level] ?? p.observance_level} />
        )}
        {p?.kashrut_level && (
          <DefRow label="Кашрут" value={KASHRUT_LABELS[p.kashrut_level] ?? p.kashrut_level} />
        )}
        {membership.joined_at && (
          <DefRow label="В общине с" value={fmt(membership.joined_at)} />
        )}
        {membership.member_since && (
          <DefRow label="Участник с" value={fmt(membership.member_since)} />
        )}
      </section>

      {interests.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-(--color-muted) mb-2">Интересы</h2>
          <div className="flex flex-wrap gap-1.5">
            {interests.map((i) => (
              <span key={i} className="text-sm px-3 py-1 rounded-full bg-(--color-muted-bg)">
                {INTEREST_LABELS[i] ?? i}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="border-t pt-6 text-xs text-(--color-muted)">
        Контакты доступны только через события и просьбы. Возможность писать напрямую — скоро.
      </section>
    </div>
  );
}

function DefRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-(--color-muted)">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
