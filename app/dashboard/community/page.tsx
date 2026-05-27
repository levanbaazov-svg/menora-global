// Community detail page — JewGo-style city guide.
// Default tab is determined by ?cat= query param (synagogue, restaurant, programs, events, people).

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CategoryNav } from './CategoryNav';
import { PlaceCard } from './PlaceCard';
import { ProgramCard } from './ProgramCard';
import { EmptyState } from '@/app/_components/ui/EmptyState';
import { LinkButton } from '@/app/_components/ui/Button';
import { Chip } from '@/app/_components/ui/Card';
import {
  PLACE_TYPES, PLACE_TYPE_LABELS, PROGRAM_CATEGORY_LABELS,
  type PlaceType, type KashrutLevel, type ProgramCategory,
} from '@/lib/places/schema';
import { upcomingShabbat, communityLocation } from '@/lib/hebcal';
import { resolveLocation } from '@/lib/hebcal/timezone';
import { cookies } from 'next/headers';
import { COOKIE_NAME as TZ_COOKIE } from '@/app/api/me/timezone/route';

// ── GraphQL ──────────────────────────────────────────────────────────────────
const FETCH = /* GraphQL */ `
  query CommunityDetail($community_id: uuid!) {
    communities_by_pk(id: $community_id) {
      id slug name city country_code timezone branding settings
    }
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
        starts_at: { _gte: "now()" }
      }
      order_by: { starts_at: asc }
      limit: 12
    ) {
      id title type starts_at location_text attendee_count_cached
    }
    memberships_aggregate(
      where: { community_id: { _eq: $community_id }, status: { _eq: active } }
    ) { aggregate { count } }
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

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const activeCategory = (await searchParams).cat ?? 'synagogue';

  // We currently support only single-community focus. Multi-community switcher in v2.
  const communityId = session.hasura.community_id;
  if (!communityId || communityId === '00000000-0000-0000-0000-000000000000') {
    return <NoActiveCommunity />;
  }

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const data = await client.request<{
    communities_by_pk: Community | null;
    places: Place[];
    programs: Program[];
    events: EventRow[];
    memberships_aggregate: { aggregate: { count: number } | null };
  }>(FETCH, { community_id: communityId });

  const community = data.communities_by_pk;
  if (!community) return <NoActiveCommunity />;

  // Group places by type for counts
  const placesByType = new Map<PlaceType, Place[]>();
  for (const p of data.places) {
    const arr = placesByType.get(p.type) ?? [];
    arr.push(p);
    placesByType.set(p.type, arr);
  }

  const counts = {
    ...Object.fromEntries(
      PLACE_TYPES.map((t) => [t, placesByType.get(t)?.length ?? 0]),
    ) as Record<PlaceType, number>,
    programs: data.programs.length,
    events: data.events.length,
    people: data.memberships_aggregate.aggregate?.count ?? 0,
  };

  // Shabbat times
  const cookieStore = await cookies();
  const userTz = cookieStore.get(TZ_COOKIE)?.value ?? null;
  const resolved = resolveLocation(userTz, community);
  const shabbat = resolved ? upcomingShabbat(resolved.location) : null;

  const isStaff = session.hasura.default_role === 'rabbi' || session.hasura.default_role === 'admin';

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-6 pt-2 pb-12">
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
            <div className="text-xs uppercase tracking-widest opacity-80 mb-1">Моя община</div>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold">{community.name}</h1>
            {(community.city || community.country_code) && (
              <p className="text-sm opacity-90 mt-1">
                📍 {[community.city, community.country_code].filter(Boolean).join(', ')}
              </p>
            )}
            <div className="flex items-center gap-3 mt-3 text-xs">
              <Chip tone="dark" size="xs">👥 {counts.people} участников</Chip>
              {shabbat && shabbat.candleLighting && (
                <Chip tone="gold" size="xs">
                  🕯 Свечи {shabbat.candleLighting.toLocaleTimeString('ru-RU', {
                    timeZone: resolved!.location.getTzid(),
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Chip>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Category nav (JewGo-style horizontal scroll) */}
      <CategoryNav counts={counts} />

      {/* Active category content */}
      <section className="mt-6">
        {PLACE_TYPES.includes(activeCategory as PlaceType) ? (
          <PlaceList
            type={activeCategory as PlaceType}
            places={placesByType.get(activeCategory as PlaceType) ?? []}
            isStaff={isStaff}
          />
        ) : activeCategory === 'programs' ? (
          <ProgramList programs={data.programs} isStaff={isStaff} />
        ) : activeCategory === 'events' ? (
          <EventList events={data.events} />
        ) : activeCategory === 'people' ? (
          <PeopleStub />
        ) : null}
      </section>
    </div>
  );
}

// ── Sub-views ────────────────────────────────────────────────────────────────
function PlaceList({ type, places, isStaff }: { type: PlaceType; places: Place[]; isStaff: boolean }) {
  const meta = PLACE_TYPE_LABELS[type];
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold">{meta.emoji} {meta.ru}</h2>
          <p className="text-sm text-(--color-fg-muted)">{places.length} {places.length === 1 ? 'место' : 'мест'}</p>
        </div>
        {isStaff && (
          <LinkButton href={`/dashboard/community/places/new?type=${type}`} variant="gold" size="sm">
            + Добавить
          </LinkButton>
        )}
      </div>

      {places.length === 0 ? (
        <EmptyState
          emoji={meta.emoji}
          title={`Пока нет ${meta.ru.toLowerCase()} в общине`}
          description={isStaff
            ? 'Добавь первое место — другие участники сразу его увидят.'
            : 'Знаешь подходящее место? Предложи его через кнопку «Подать заявку».'}
          action={
            <LinkButton
              href={`/dashboard/community/places/new?type=${type}`}
              variant="gold" size="sm"
            >
              {isStaff ? 'Добавить место' : 'Предложить место'}
            </LinkButton>
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {places.map((p) => <PlaceCard key={p.id} {...p} />)}
        </div>
      )}
    </>
  );
}

function ProgramList({ programs, isStaff }: { programs: Program[]; isStaff: boolean }) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold">📖 Программы</h2>
          <p className="text-sm text-(--color-fg-muted)">{programs.length} активных</p>
        </div>
        {isStaff && (
          <LinkButton href="/dashboard/community/programs/new" variant="gold" size="sm">
            + Добавить
          </LinkButton>
        )}
      </div>

      {programs.length === 0 ? (
        <EmptyState
          emoji="📖"
          title="Пока нет программ"
          description={isStaff
            ? 'Создай первую программу — например Hebrew school или Couples learning.'
            : 'Раввин ещё не добавил программы для этой общины.'}
          action={isStaff
            ? <LinkButton href="/dashboard/community/programs/new" variant="gold" size="sm">Создать программу</LinkButton>
            : null}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {programs.map((p) => <ProgramCard key={p.id} {...p} />)}
        </div>
      )}
    </>
  );
}

function EventList({ events }: { events: EventRow[] }) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold">📅 События</h2>
          <p className="text-sm text-(--color-fg-muted)">{events.length} ближайших</p>
        </div>
        <LinkButton href="/dashboard/events" variant="ghost" size="sm">
          Все события →
        </LinkButton>
      </div>

      {events.length === 0 ? (
        <EmptyState
          emoji="📅"
          title="Ближайших событий нет"
          description="Создай первое или подожди когда раввин опубликует."
          action={<LinkButton href="/dashboard/events/new" variant="gold" size="sm">Создать событие</LinkButton>}
        />
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/dashboard/events/${e.id}`}
              className="block rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 p-4 hover:border-(--color-gold)/40 transition-colors"
            >
              <div className="font-semibold">{e.title}</div>
              <div className="text-xs text-(--color-fg-muted) mt-1">
                {new Date(e.starts_at).toLocaleString('ru-RU', {
                  weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
                {e.location_text && ` · ${e.location_text}`}
                {' · '}{e.attendee_count_cached} идут
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function PeopleStub() {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl font-semibold">👥 Участники</h2>
        <LinkButton href="/dashboard/people" variant="ghost" size="sm">
          Открыть directory →
        </LinkButton>
      </div>
      <p className="text-sm text-(--color-fg-muted)">
        Полный список с поиском и фильтрами — по ссылке «Открыть directory».
      </p>
    </>
  );
}

function NoActiveCommunity() {
  return (
    <div className="max-w-2xl mx-auto px-5 md:px-6 pt-12 pb-12">
      <EmptyState
        emoji="🕍"
        title="Ты ещё не в общине"
        description="Прими приглашение или подай заявку — и здесь появится твой город-гид."
        action={<LinkButton href="/onboarding/community_choice" variant="gold">Найти общину</LinkButton>}
      />
    </div>
  );
}
