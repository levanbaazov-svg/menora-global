// Discover communities — vertical feed + city filter chips.
// This is BOTH the "I'm not in a community yet" view and the destination of
// the "Поиск другой общины" button. Uses admin secret for cross-community read.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CommunityCard, type CommunityCardData } from '../CommunityCard';
import { EmptyState } from '@/app/_components/ui/EmptyState';

const FETCH = /* GraphQL */ `
  query DiscoverCommunities($user_id: uuid!) {
    communities(
      where: { is_public: { _eq: true } }
      order_by: { member_count_cached: desc }
    ) {
      slug name city country_code denomination hero_image_url
      member_count_cached description
    }
    my_memberships: memberships(
      where: { user_id: { _eq: $user_id }, status: { _eq: active } }
    ) { community { slug } }
  }
`;

interface Row extends CommunityCardData {}

export default async function DiscoverCommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const activeCity = (await searchParams).city ?? null;
  const t = await getTranslations('communityPages');

  const data = await hasuraAdmin.request<{
    communities: Row[];
    my_memberships: Array<{ community: { slug: string } | null }>;
  }>(FETCH, { user_id: session.user.id });

  const mySlugs = new Set(
    data.my_memberships.map((m) => m.community?.slug).filter(Boolean) as string[],
  );

  // City filter chips — unique cities present in data.
  const cities = Array.from(
    new Set(data.communities.map((c) => c.city).filter(Boolean) as string[]),
  ).sort();

  const filtered = activeCity
    ? data.communities.filter((c) => c.city === activeCity)
    : data.communities;

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-8">
      <Link
        href="/dashboard/community"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 inline-block"
      >
        ← {t('back.back')}
      </Link>

      <header className="mb-4 px-0.5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
            {t('discover.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('discover.subtitle')}
          </p>
        </div>
        <Link
          href="/dashboard/community/new"
          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold shadow-[var(--shadow-gold)] hover:opacity-95 active:scale-95 transition-all whitespace-nowrap"
        >
          + {t('newCommunity.cta')}
        </Link>
      </header>

      {/* City filter chips */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-hide mb-5">
        <div className="flex gap-2 min-w-max md:flex-wrap">
          <FilterChip href="/dashboard/community/discover" label={t('discover.all')} active={!activeCity} />
          {cities.map((city) => (
            <FilterChip
              key={city}
              href={`/dashboard/community/discover?city=${encodeURIComponent(city)}`}
              label={city}
              active={activeCity === city}
            />
          ))}
        </div>
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <EmptyState
          emoji="🌍"
          title={t('discover.emptyTitle')}
          description={t('discover.emptyDescription')}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((c, i) => (
            <CommunityCard
              key={c.slug}
              c={{ ...c, isMine: mySlugs.has(c.slug) }}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`
        shrink-0 inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors
        ${active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-card border-border text-foreground/70 hover:border-primary/40 hover:text-foreground'}
      `}
    >
      {label}
    </Link>
  );
}
