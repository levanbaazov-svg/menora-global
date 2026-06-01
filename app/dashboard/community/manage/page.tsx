// Staff (rabbi/admin) management hub for community content.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { type Locale } from '@/i18n/config';
import { PLACE_TYPE_LABELS, PROGRAM_CATEGORY_LABELS, PLACE_TYPES } from '@/lib/places/schema';

const FETCH = /* GraphQL */ `
  query ManageCommunity($community_id: uuid!) {
    pending_count: places_aggregate(
      where: {
        community_id: { _eq: $community_id }
        submission_status: { _eq: pending }
      }
    ) { aggregate { count } }

    places(
      where: {
        community_id: { _eq: $community_id }
        submission_status: { _eq: approved }
        archived_at: { _is_null: true }
      }
    ) {
      type
    }

    programs_count: programs_aggregate(
      where: { community_id: { _eq: $community_id }, status: { _eq: active } }
    ) { aggregate { count } }
  }
`;

export default async function ManagePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const role = session.hasura.default_role;
  if (role !== 'rabbi' && role !== 'admin') redirect('/dashboard/community');

  const tr = await getTranslations('communityPages');
  const locale = (await getLocale()) as Locale;
  const client = await hasuraAsCurrentUser({ role });
  const data = await client.request<{
    pending_count: { aggregate: { count: number } | null };
    places: Array<{ type: keyof typeof PLACE_TYPE_LABELS }>;
    programs_count: { aggregate: { count: number } | null };
  }>(FETCH, { community_id: session.hasura.community_id });

  const placeCounts: Record<string, number> = {};
  for (const p of data.places) {
    placeCounts[p.type] = (placeCounts[p.type] ?? 0) + 1;
  }
  const pendingCount = data.pending_count.aggregate?.count ?? 0;
  const programsCount = data.programs_count.aggregate?.count ?? 0;

  return (
    <div className="container mx-auto max-w-2xl px-4 md:px-6 pt-3 pb-8">
      <Link
        href="/dashboard/community"
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← {tr('back.cityGuide')}
      </Link>

      <header className="mb-8">
        <div className="text-xs uppercase tracking-widest text-(--color-gold) mb-1">
          {tr('manage.eyebrow')}
        </div>
        <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
          {tr('manage.title')}
        </h1>
        <p className="text-sm text-(--color-fg-muted) mt-2 max-w-xl">
          {tr('manage.subtitle')}
        </p>
      </header>

      <a
        href="/dashboard/community/manage/edit"
        className="mb-6 flex items-center justify-between rounded-2xl bg-card ring-1 ring-border/70 px-4 py-3.5 hover:ring-primary/30 transition-all"
      >
        <div>
          <div className="text-sm font-medium leading-tight">{tr('manage.profileTitle')}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{tr('manage.profileSubtitle')}</div>
        </div>
        <span className="text-muted-foreground">→</span>
      </a>


      {/* Pending banner */}
      {pendingCount > 0 && (
        <Link
          href="/dashboard/community/pending"
          className="mb-8 block rounded-2xl bg-(--color-warning-soft) border border-(--color-warning)/30 p-4 hover:border-(--color-warning)/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">⏳</div>
            <div className="flex-1">
              <div className="font-medium">
                {tr('manage.pendingBanner', { count: pendingCount })}
              </div>
              <div className="text-xs text-(--color-fg-muted)">{tr('manage.pendingHint')}</div>
            </div>
            <span className="text-(--color-warning)">→</span>
          </div>
        </Link>
      )}

      {/* Places by type */}
      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold mb-4">{tr('manage.placesTitle')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PLACE_TYPES.map((pt) => {
            const meta = PLACE_TYPE_LABELS[pt];
            const cnt = placeCounts[pt] ?? 0;
            return (
              <Link
                key={pt}
                href={`/dashboard/community/places/new?type=${pt}`}
                className="block rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 p-4 hover:border-(--color-gold)/40 hover:shadow-[var(--shadow-md)] transition-all"
              >
                <div className="text-3xl mb-2">{meta.emoji}</div>
                <div className="font-semibold text-sm">{meta[locale]}</div>
                <div className="text-xs text-(--color-fg-muted) mt-1">
                  {cnt > 0 ? tr('manage.placeCount', { count: cnt }) : tr('manage.placeAddFirst')}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Programs */}
      <section>
        <h2 className="font-serif text-xl font-semibold mb-4">{tr('manage.programsTitle')}</h2>
        <p className="text-sm text-(--color-fg-muted) mb-4">
          {programsCount > 0
            ? tr('manage.programsActive', { count: programsCount })
            : tr('manage.programsEmpty')}
        </p>
        <Link
          href="/dashboard/community/programs/new"
          className="inline-block px-5 py-2.5 rounded-full bg-(--color-deep) text-white text-sm font-semibold hover:opacity-90"
        >
          {tr('manage.createProgram')}
        </Link>
        {programsCount > 0 && (
          <div className="mt-6">
            <h3 className="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-3">{tr('manage.categories')}</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PROGRAM_CATEGORY_LABELS).map(([key, val]) => (
                <Link
                  key={key}
                  href={`/dashboard/community/programs/new?category=${key}`}
                  className="text-xs px-3 py-1.5 rounded-full border hover:border-(--color-gold)"
                >
                  {val.emoji} {tr(`programCategories.${key}`)}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
