import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Avatar } from '../_Avatar';
import {
  displayName, DENOMINATION_LABELS, OBSERVANCE_LABELS, KASHRUT_LABELS,
  INTEREST_LABELS, ROLE_BADGES, type UserDisplay,
} from '@/lib/profile/display';

const FETCH_ME = /* GraphQL */ `
  query Me($user_id: uuid!, $thirty_days_ago: date!) {
    users_by_pk(id: $user_id) {
      id email name image_url created_at onboarded_at locale
      profile {
        legal_first_name legal_last_name hebrew_name
        gender date_of_birth phone_e164
        marital_status has_children children_ages spouse_hebrew_name
        denomination observance_level kashrut_level
        interests languages bio profile_visibility notification_prefs
      }
    }
    memberships(where: { user_id: { _eq: $user_id }, status: { _eq: active } }) {
      role community_id community_role member_since joined_at
      community { id name slug city country_code }
    }
    checkins_30: checkins_aggregate(where: {
      user_id: { _eq: $user_id }
      gregorian_date: { _gte: $thirty_days_ago }
    }) { aggregate { count } }
  }
`;

interface MyData {
  users_by_pk: UserDisplay & {
    created_at: string; onboarded_at: string | null; locale: string;
    profile: (UserDisplay['profile'] & {
      gender?: string | null; date_of_birth?: string | null; phone_e164?: string | null;
      marital_status?: string | null; has_children?: boolean | null;
      children_ages?: number[] | null; spouse_hebrew_name?: string | null;
      languages?: string[] | null;
      notification_prefs?: { channels?: string[]; categories?: string[] } | null;
    }) | null;
  } | null;
  memberships: Array<{
    role: 'member' | 'rabbi' | 'admin';
    community_id: string;
    community_role: string | null;
    member_since: string | null;
    joined_at: string | null;
    community: { id: string; name: string; slug: string; city: string | null; country_code: string | null };
  }>;
  checkins_30: { aggregate: { count: number } | null };
}

function fmt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default async function MyProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  // Admin secret so we can read our own private fields (member-role permission
  // exposes only public columns; self-fetch is a trusted server-side op).
  const data = await hasuraAdmin.request<MyData>(FETCH_ME, {
    user_id: session.user.id,
    thirty_days_ago: thirtyDaysAgo,
  });

  const user = data.users_by_pk;
  if (!user) redirect('/');
  const p = user.profile;
  const name = displayName(user);
  const checkinsCount = data.checkins_30.aggregate?.count ?? 0;
  const t = await getTranslations('profile');
  const tc = await getTranslations('miscChrome');
  const genderLabel = (v: string) => (tc.has(`gender.${v}`) ? tc(`gender.${v}`) : v);
  const maritalLabel = (v: string) => (tc.has(`marital.${v}`) ? tc(`marital.${v}`) : v);
  const visibilityLabel = (v: string) => (tc.has(`visibility.${v}`) ? tc(`visibility.${v}`) : v);

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-8">
      <Link href="/dashboard" className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-6 inline-block">
        {t('backToDashboard')}
      </Link>

      <header className="flex items-start gap-5 mb-8">
        <Avatar user={user} size="xl" />
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-2xl font-semibold leading-tight tracking-tight mb-1">{name}</h1>
          {p?.hebrew_name && <p className="text-(--color-fg-muted) mb-2">{p.hebrew_name}</p>}
          <p className="text-sm text-(--color-fg-muted)">{user.email}</p>
        </div>
        <Link
          href="/dashboard/me/edit"
          className="px-4 py-2 rounded-full border text-sm font-semibold hover:bg-(--color-muted-bg)"
        >
          {t('edit')}
        </Link>
      </header>

      {/* Communities */}
      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold mb-3">{t('myCommunities')}</h2>
        <div className="space-y-2">
          {data.memberships.map((m) => {
            const badge = ROLE_BADGES[m.role];
            return (
              <div key={m.community_id} className="border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{m.community.name}</div>
                  <div className="text-xs text-(--color-fg-muted) mt-0.5">
                    {[m.community.city, m.community.country_code].filter(Boolean).join(', ')}
                    {m.joined_at && ` · с ${fmt(m.joined_at)}`}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${badge.cls}`}>{m.role}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Activity stats */}
      <section className="mb-8 grid grid-cols-3 gap-3">
        <Stat label={t('stat_checkins')} value={checkinsCount} />
        <Stat label={t('stat_onboarding')} value={user.onboarded_at ? '✓' : '–'} />
        <Stat label={t('stat_memberSince')} value={fmt(user.created_at) ?? '—'} />
      </section>

      {/* Bio */}
      {p?.bio && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-(--color-fg-muted) mb-2">{t('about')}</h2>
          <p className="whitespace-pre-wrap">{p.bio}</p>
        </section>
      )}

      {/* Profile details */}
      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold mb-3">{t('profile')}</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {p?.gender && <Row k={t('fields.gender')} v={genderLabel(p.gender)} />}
          {p?.date_of_birth && <Row k={t('fields.dateOfBirth')} v={fmt(p.date_of_birth)} />}
          {p?.phone_e164 && <Row k={t('fields.phone')} v={p.phone_e164} />}
          {p?.marital_status && <Row k={t('fields.maritalStatus')} v={maritalLabel(p.marital_status)} />}
          {p?.has_children && (
            <Row k={t('fields.children')} v={p.children_ages?.length ? t('childrenWithAges', { count: p.children_ages.length, ages: p.children_ages.join(', ') }) : t('childrenYes')} />
          )}
          {p?.spouse_hebrew_name && <Row k={t('fields.spouse')} v={p.spouse_hebrew_name} />}
          {p?.denomination && <Row k={t('fields.denomination')} v={DENOMINATION_LABELS[p.denomination] ?? p.denomination} />}
          {p?.observance_level && <Row k={t('fields.observance')} v={OBSERVANCE_LABELS[p.observance_level] ?? p.observance_level} />}
          {p?.kashrut_level && <Row k={t('fields.kashrut')} v={KASHRUT_LABELS[p.kashrut_level] ?? p.kashrut_level} />}
          {p?.languages && p.languages.length > 0 && <Row k={t('fields.languages')} v={p.languages.join(', ')} />}
          {p?.profile_visibility && <Row k={t('fields.visibility')} v={visibilityLabel(p.profile_visibility)} />}
        </dl>
      </section>

      {/* Interests */}
      {p?.interests && p.interests.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-(--color-fg-muted) mb-2">{t('interests')}</h2>
          <div className="flex flex-wrap gap-1.5">
            {p.interests.map((i) => (
              <span key={i} className="text-sm px-3 py-1 rounded-full bg-(--color-muted-bg)">
                {INTEREST_LABELS[i] ?? i}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Notifications */}
      {p?.notification_prefs && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-(--color-fg-muted) mb-2">{t('notifications')}</h2>
          <p className="text-sm text-(--color-fg-muted)">
            {t('channels')}: {p.notification_prefs.channels?.join(', ') ?? '—'}<br />
            {t('categories')}: {p.notification_prefs.categories?.join(', ') ?? '—'}
          </p>
        </section>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null }) {
  if (!v) return null;
  return (
    <>
      <dt className="text-(--color-fg-muted)">{k}</dt>
      <dd>{v}</dd>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border rounded-xl p-4 text-center">
      <div className="font-serif text-2xl font-semibold">{value}</div>
      <div className="text-xs text-(--color-fg-muted) mt-1">{label}</div>
    </div>
  );
}
