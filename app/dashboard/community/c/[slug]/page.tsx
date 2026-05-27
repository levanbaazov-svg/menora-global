// Visitor view of another community — read-only city guide.
// Tourist/relocator browsing without being a member. Uses admin secret to bypass
// per-community RLS but only exposes public-safe data.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { CategoryNav } from '../../CategoryNav';
import { PlaceCard } from '../../PlaceCard';
import { ProgramCard } from '../../ProgramCard';
import { EmptyState } from '@/app/_components/ui/EmptyState';
import { LinkButton } from '@/app/_components/ui/Button';
import { Chip } from '@/app/_components/ui/Card';
import {
  PLACE_TYPES, PLACE_TYPE_LABELS,
  type PlaceType, type KashrutLevel, type ProgramCategory,
} from '@/lib/places/schema';
import { upcomingShabbat } from '@/lib/hebcal';
import { resolveLocation } from '@/lib/hebcal/timezone';
import { COOKIE_NAME as TZ_COOKIE } from '@/app/api/me/timezone/route';

const FETCH = /* GraphQL */ `
  query VisitorCommunity($slug: citext!) {
    communities(where: { slug: { _eq: $slug } }, limit: 1) {
      id slug name city country_code timezone branding settings
    }
  }
`;

const FETCH_DATA = /* GraphQL */ `
  query VisitorData($community_id: uuid!, $user_id: uuid!) {
    places(
      where: {
        community_id: { _eq: $community_id }
        submission_status: { _eq: approved }
        archived_at: { _is_null: true }
      }
    ) {
      id type name description photo_url address
      kashrut_level kashrut_authority price_level
      cuisine_tags dietary_tags
    }
    programs(
      where: { community_id: { _eq: $community_id }, status: { _eq: active } }
      order_by: [{ category: asc }, { name: asc }]
    ) {
      id category name description photo_url schedule_text
      age_min age_max price_amount price_currency price_period
      enrolled_count_cached max_capacity
    }
    events(
      where: {
        community_id: { _eq: $community_id }
        status: { _eq: published }
        visibility: { _in: [community, public_in_app] }
        starts_at: { _gte: "now()" }
      }
      order_by: { starts_at: asc }
      limit: 12
    ) {
      id title type starts_at location_text attendee_count_cached
    }
    members: memberships_aggregate(
      where: { community_id: { _eq: $community_id }, status: { _eq: active } }
    ) { aggregate { count } }
    my_membership: memberships(
      where: {
        community_id: { _eq: $community_id }
        user_id: { _eq: $user_id }
      }
      limit: 1
    ) {
      status role
    }
  }
`;

interface Community {
  id: string; slug: string; name: string;
  city: string | null; country_code: string | null; timezone: string;
}

interface Place {
  id: string; type: PlaceType; name: string;
  description: string | null; photo_url: string | null; address: string | null;
  kashrut_level: KashrutLevel | null; kashrut_authority: string | null;
  price_level: string | null;
  cuisine_tags: string[]; dietary_tags: string[];
}

interface Program {
  id: string; category: ProgramCategory; name: string;
  description: string | null; photo_url: string | null;
  schedule_text: string | null;
  age_min: number | null; age_max: number | null;
  price_amount: number | null; price_currency: string | null; price_period: string | null;
  enrolled_count_cached: number; max_capacity: number | null;
}

interface EventRow {
  id: string; title: string; type: string;
  starts_at: string; location_text: string | null;
  attendee_count_cached: number;
}

export default async function VisitorCommunityPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const activeCategory = (await searchParams).cat ?? 'programs';

  const found = await hasuraAdmin.request<{ communities: Community[] }>(FETCH, { slug });
  const community = found.communities[0];
  if (!community) notFound();

  // Redirect to /community if it's user's OWN community.
  if (community.id === session.hasura.community_id) {
    redirect(`/dashboard/community?cat=${activeCategory}`);
  }

  const data = await hasuraAdmin.request<{
    places: Place[];
    programs: Program[];
    events: EventRow[];
    members: { aggregate: { count: number } | null };
    my_membership: Array<{ status: string; role: string }>;
  }>(FETCH_DATA, { community_id: community.id, user_id: session.user.id });

  const placesByType = new Map<PlaceType, Place[]>();
  for (const p of data.places) {
    const arr = placesByType.get(p.type) ?? [];
    arr.push(p);
    placesByType.set(p.type, arr);
  }

  const foodPlaces = [
    ...(placesByType.get('restaurant') ?? []),
    ...(placesByType.get('cafe') ?? []),
  ];

  const counts = {
    ...Object.fromEntries(PLACE_TYPES.map((t) => [t, placesByType.get(t)?.length ?? 0])) as Record<PlaceType, number>,
    food: foodPlaces.length,
    programs: data.programs.length,
    events: data.events.length,
    people: data.members.aggregate?.count ?? 0,
  };

  const cookieStore = await cookies();
  const userTz = cookieStore.get(TZ_COOKIE)?.value ?? null;
  const resolved = resolveLocation(userTz, community);
  const shabbat = resolved ? upcomingShabbat(resolved.location) : null;

  const existingMembership = data.my_membership[0];

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-6 pt-2 pb-12">
      <Link
        href="/dashboard/community/discover"
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← Discover
      </Link>

      {/* Hero */}
      <section className="-mx-5 md:mx-0 mb-6 md:mb-8">
        <div
          className="relative h-48 md:h-56 md:rounded-2xl overflow-hidden flex items-end p-5 md:p-7 text-white"
          style={{
            background:
              'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(212,162,60,0.4)), url(/community-hero-fallback.svg) center/cover',
          }}
        >
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80 mb-1">Гость</div>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold">{community.name}</h1>
            {(community.city || community.country_code) && (
              <p className="text-sm opacity-90 mt-1">
                📍 {[community.city, community.country_code].filter(Boolean).join(', ')}
              </p>
            )}
            <div className="flex items-center gap-3 mt-3 text-xs">
              <Chip tone="dark" size="xs">👥 {counts.people} участников</Chip>
              {shabbat?.candleLighting && (
                <Chip tone="gold" size="xs">
                  🕯 Свечи {shabbat.candleLighting.toLocaleTimeString('ru-RU', {
                    timeZone: resolved!.location.getTzid(), hour: '2-digit', minute: '2-digit',
                  })}
                </Chip>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Visitor CTA — request to join */}
      {!existingMembership && (
        <section className="mb-6 rounded-2xl bg-(--color-gold-soft)/40 border border-(--color-gold)/30 p-4 md:p-5 flex items-start gap-3">
          <div className="text-2xl">✦</div>
          <div className="flex-1">
            <p className="text-sm font-medium">Хочешь стать частью этой общины?</p>
            <p className="text-xs text-(--color-fg-muted) mt-0.5">
              Раввин получит твою заявку и подтвердит.
            </p>
          </div>
          <LinkButton href={`/onboarding/community_choice?community=${community.slug}`} variant="gold" size="sm">
            Подать заявку
          </LinkButton>
        </section>
      )}

      {existingMembership?.status === 'pending' && (
        <section className="mb-6 rounded-2xl bg-(--color-warning-soft) border border-(--color-warning)/30 p-4 text-sm">
          ⏳ Заявка на вступление ожидает рассмотрения раввином.
        </section>
      )}

      {/* Category nav — visitor cannot add places (isStaff=false) */}
      <CategoryNav counts={counts} isStaff={false} />

      {/* Content */}
      <section className="mt-6">
        {activeCategory === 'food' ? (
          <VisitorPlaceList places={foodPlaces} title="🍽 Кафе и рестораны" />
        ) : PLACE_TYPES.includes(activeCategory as PlaceType) ? (
          <VisitorPlaceList
            places={placesByType.get(activeCategory as PlaceType) ?? []}
            title={`${PLACE_TYPE_LABELS[activeCategory as PlaceType].emoji} ${PLACE_TYPE_LABELS[activeCategory as PlaceType].ru}`}
          />
        ) : activeCategory === 'programs' ? (
          <VisitorProgramList programs={data.programs} />
        ) : activeCategory === 'events' ? (
          <VisitorEventList events={data.events} />
        ) : activeCategory === 'people' ? (
          <p className="text-sm text-(--color-fg-muted)">
            Список участников доступен только членам общины.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function VisitorPlaceList({ places, title }: { places: Place[]; title: string }) {
  return (
    <>
      <div className="mb-4">
        <h2 className="font-serif text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-(--color-fg-muted)">{places.length}</p>
      </div>
      {places.length === 0 ? (
        <EmptyState emoji="✦" title="Здесь пока пусто" description="Раввин этой общины ещё не добавил места этой категории." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {places.map((p) => <PlaceCard key={p.id} {...p} />)}
        </div>
      )}
    </>
  );
}

function VisitorProgramList({ programs }: { programs: Program[] }) {
  return (
    <>
      <h2 className="font-serif text-2xl font-semibold mb-4">📖 Программы</h2>
      {programs.length === 0 ? (
        <EmptyState emoji="📖" title="Программ ещё нет" description="Раввин этой общины ещё не публиковал программы." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {programs.map((p) => <ProgramCard key={p.id} {...p} />)}
        </div>
      )}
    </>
  );
}

function VisitorEventList({ events }: { events: EventRow[] }) {
  return (
    <>
      <h2 className="font-serif text-2xl font-semibold mb-4">📅 Ближайшие события</h2>
      {events.length === 0 ? (
        <EmptyState emoji="📅" title="Пока пусто" description="Раввин этой общины ещё не публиковал события." />
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 p-4">
              <div className="font-semibold">{e.title}</div>
              <div className="text-xs text-(--color-fg-muted) mt-1">
                {new Date(e.starts_at).toLocaleString('ru-RU', {
                  weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
                {e.location_text && ` · ${e.location_text}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
