// City guide — kosher places by category (synagogues, food, stores, …).
// Moved here from the old community home; the community home is now the
// full community profile. JewGo-style category nav + place cards.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { LOCALE_BCP47, type Locale } from '@/i18n/config';
import { CategoryNav } from '../CategoryNav';
import { PlaceCard } from '../PlaceCard';
import { ProgramCard } from '../ProgramCard';
import { EmptyState } from '@/app/_components/ui/EmptyState';
import { LinkButton } from '@/app/_components/ui/Button';
import {
  PLACE_TYPES, PLACE_TYPE_LABELS,
  type PlaceType, type KashrutLevel, type ProgramCategory,
} from '@/lib/places/schema';

const FETCH = /* GraphQL */ `
  query CityGuide($community_id: uuid!) {
    places(
      where: {
        community_id: { _eq: $community_id }
        submission_status: { _eq: approved }
        archived_at: { _is_null: true }
      }
    ) {
      id type name description photo_url address
      kashrut_level kashrut_authority price_level cuisine_tags dietary_tags
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
      where: { community_id: { _eq: $community_id }, status: { _eq: published }, starts_at: { _gte: "now()" } }
      order_by: { starts_at: asc } limit: 12
    ) {
      id title type starts_at location_text attendee_count_cached
    }
    memberships_aggregate(where: { community_id: { _eq: $community_id }, status: { _eq: active } }) {
      aggregate { count }
    }
  }
`;

interface Place {
  id: string; type: PlaceType; name: string;
  description: string | null; photo_url: string | null; address: string | null;
  kashrut_level: KashrutLevel | null; kashrut_authority: string | null;
  price_level: string | null; cuisine_tags: string[]; dietary_tags: string[];
}
interface Program {
  id: string; category: ProgramCategory; name: string;
  description: string | null; photo_url: string | null; schedule_text: string | null;
  age_min: number | null; age_max: number | null;
  price_amount: number | null; price_currency: string | null; price_period: string | null;
  enrolled_count_cached: number; max_capacity: number | null;
}
interface EventRow {
  id: string; title: string; type: string; starts_at: string;
  location_text: string | null; attendee_count_cached: number;
}

export default async function CityGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const cid = session.hasura.community_id;
  if (!cid || cid === '00000000-0000-0000-0000-000000000000') {
    redirect('/dashboard/community/discover');
  }

  const activeCategory = (await searchParams).cat ?? 'synagogue';
  const t = await getTranslations('communityPages');
  const locale = (await getLocale()) as Locale;
  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const data = await client.request<{
    places: Place[];
    programs: Program[];
    events: EventRow[];
    memberships_aggregate: { aggregate: { count: number } | null };
  }>(FETCH, { community_id: cid });

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
    people: data.memberships_aggregate.aggregate?.count ?? 0,
  };

  const isStaff = session.hasura.default_role === 'rabbi' || session.hasura.default_role === 'admin';

  return (
    <div className="container mx-auto max-w-2xl px-4 md:px-6 pt-3 pb-8">
      <Link
        href="/dashboard/community"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 inline-block"
      >
        ← {t('back.community')}
      </Link>

      <header className="mb-4 px-0.5">
        <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
          {t('cityGuide.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('cityGuide.subtitle')}
        </p>
      </header>

      <CategoryNav counts={counts} isStaff={isStaff} />

      <section className="mt-6">
        {activeCategory === 'food' ? (
          <PlaceGrid places={foodPlaces} title={t('cityGuide.foodTitle')} isStaff={isStaff} addType="restaurant" t={t} />
        ) : PLACE_TYPES.includes(activeCategory as PlaceType) ? (
          <PlaceGrid
            places={placesByType.get(activeCategory as PlaceType) ?? []}
            title={PLACE_TYPE_LABELS[activeCategory as PlaceType][locale]}
            isStaff={isStaff}
            addType={activeCategory as PlaceType}
            t={t}
          />
        ) : activeCategory === 'programs' ? (
          <ProgramGrid programs={data.programs} t={t} />
        ) : activeCategory === 'events' ? (
          <EventList events={data.events} t={t} locale={locale} />
        ) : null}
      </section>
    </div>
  );
}

function PlaceGrid({ places, title, isStaff, addType, t }: {
  places: Place[]; title: string; isStaff: boolean; addType: PlaceType;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl font-semibold">{title}</h2>
        {isStaff && (
          <LinkButton href={`/dashboard/community/places/new?type=${addType}`} variant="gold" size="sm">{t('cityGuide.add')}</LinkButton>
        )}
      </div>
      {places.length === 0 ? (
        <EmptyState emoji="✦" title={t('cityGuide.emptyTitle')}
          description={isStaff ? t('cityGuide.emptyStaff') : t('cityGuide.emptyMember')}
          action={<LinkButton href={`/dashboard/community/places/new?type=${addType}`} variant="gold" size="sm">{isStaff ? t('cityGuide.addAction') : t('cityGuide.proposeAction')}</LinkButton>}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {places.map((p) => <PlaceCard key={p.id} {...p} />)}
        </div>
      )}
    </>
  );
}

function ProgramGrid({ programs, t }: {
  programs: Program[];
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <>
      <h2 className="font-serif text-xl font-semibold mb-4">{t('cityGuide.programsTitle')}</h2>
      {programs.length === 0 ? (
        <EmptyState emoji="📖" title={t('cityGuide.programsEmpty')} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {programs.map((p) => <ProgramCard key={p.id} {...p} />)}
        </div>
      )}
    </>
  );
}

function EventList({ events, t, locale }: {
  events: EventRow[];
  t: Awaited<ReturnType<typeof getTranslations>>;
  locale: Locale;
}) {
  return (
    <>
      <h2 className="font-serif text-xl font-semibold mb-4">{t('cityGuide.eventsTitle')}</h2>
      {events.length === 0 ? (
        <EmptyState emoji="📅" title={t('cityGuide.eventsEmpty')} />
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <Link key={e.id} href={`/dashboard/events/${e.id}`}
              className="block rounded-2xl bg-card ring-1 ring-border/70 p-4 hover:ring-primary/30 transition-all">
              <div className="font-medium text-sm">{e.title}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(e.starts_at).toLocaleString(LOCALE_BCP47[locale], { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {e.location_text && ` · ${e.location_text}`}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
