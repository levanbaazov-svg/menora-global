// Browse other communities — for tourists, relocators, or curious users.
// Uses admin secret for cross-community read since member-role only sees own community.
// Public-safe fields only.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { EmptyState } from '@/app/_components/ui/EmptyState';
import { LinkButton } from '@/app/_components/ui/Button';

const FETCH = /* GraphQL */ `
  query DiscoverCommunities($user_id: uuid!) {
    communities(order_by: { name: asc }) {
      id slug name city country_code timezone branding
      members: memberships_aggregate(where: { status: { _eq: active } }) {
        aggregate { count }
      }
      places_aggregate(where: { submission_status: { _eq: approved }, archived_at: { _is_null: true } }) {
        aggregate { count }
      }
    }
    my_memberships: memberships(
      where: { user_id: { _eq: $user_id }, status: { _eq: active } }
    ) { community_id }
  }
`;

interface CommunityRow {
  id: string; slug: string; name: string;
  city: string | null; country_code: string | null; timezone: string;
  branding: Record<string, unknown> | null;
  members: { aggregate: { count: number } | null };
  places_aggregate: { aggregate: { count: number } | null };
}

const REGION_FROM_TIMEZONE = (tz: string): string => {
  if (tz.startsWith('Europe/')) return '🇪🇺 Европа';
  if (tz === 'Asia/Jerusalem') return '🇮🇱 Израиль';
  if (tz.startsWith('America/')) return '🌎 Америка';
  if (tz.startsWith('Asia/')) return '🌏 Азия';
  if (tz.startsWith('Africa/')) return '🌍 Африка';
  if (tz.startsWith('Australia/') || tz.startsWith('Pacific/')) return '🇦🇺 Океания';
  return '🌐 Другое';
};

export default async function DiscoverCommunitiesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const data = await hasuraAdmin.request<{
    communities: CommunityRow[];
    my_memberships: Array<{ community_id: string }>;
  }>(FETCH, { user_id: session.user.id });

  const myIds = new Set(data.my_memberships.map((m) => m.community_id));
  const others = data.communities.filter((c) => !myIds.has(c.id));

  // Group by region
  const byRegion = new Map<string, CommunityRow[]>();
  for (const c of others) {
    const region = REGION_FROM_TIMEZONE(c.timezone);
    const arr = byRegion.get(region) ?? [];
    arr.push(c);
    byRegion.set(region, arr);
  }
  const regions = Array.from(byRegion.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-6 pt-2 pb-12">
      <Link
        href="/dashboard/community"
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← Назад
      </Link>

      <header className="mb-8">
        <div className="text-xs uppercase tracking-widest text-(--color-gold) mb-2">
          ✈️ Discover
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold leading-tight mb-3">
          Все общины мира
        </h1>
        <p className="text-(--color-fg-muted) max-w-xl">
          Найди шаббат-ужин в любом городе. Места, программы, синагоги — еврейская жизнь
          там куда ты летишь или переезжаешь.
        </p>
      </header>

      {others.length === 0 ? (
        <EmptyState
          emoji="🌍"
          title="Пока ты единственный"
          description="Сейчас Menorah запускается в твоей общине. Поделись с раввинами других общин — пусть подключаются."
          action={<LinkButton href="/dashboard/community" variant="gold">Назад к своей общине</LinkButton>}
        />
      ) : (
        regions.map(([region, communities]) => (
          <section key={region} className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4 flex items-center gap-2">
              {region}
              <span className="text-xs text-(--color-fg-muted) font-sans font-normal">
                · {communities.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {communities.map((c) => (
                <CommunityCard key={c.id} c={c} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function CommunityCard({ c }: { c: CommunityRow }) {
  const memberCount = c.members.aggregate?.count ?? 0;
  const placeCount = c.places_aggregate.aggregate?.count ?? 0;
  return (
    <Link
      href={`/dashboard/community/c/${c.slug}`}
      className="block rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 overflow-hidden hover:border-(--color-gold)/40 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all"
    >
      {/* Photo / gradient */}
      <div
        className="aspect-[4/3] relative photo-overlay"
        style={{
          background:
            'linear-gradient(135deg, rgba(15,23,42,0.7), rgba(212,162,60,0.3)), url(/community-hero-fallback.svg) center/cover',
        }}
      >
        <div className="absolute inset-0 p-4 flex flex-col justify-end text-white z-10">
          <h3 className="font-serif text-lg font-semibold leading-tight">{c.name}</h3>
          {(c.city || c.country_code) && (
            <p className="text-xs opacity-90 mt-0.5">
              {[c.city, c.country_code].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="px-4 py-3 flex items-center gap-3 text-xs text-(--color-fg-muted)">
        <span>👥 {memberCount}</span>
        <span>·</span>
        <span>📍 {placeCount} {placeCount === 1 ? 'место' : 'мест'}</span>
      </div>
    </Link>
  );
}
