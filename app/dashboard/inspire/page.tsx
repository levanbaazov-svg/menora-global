// Inspire hub — today's featured + browse by category + your bookmarks.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { InspirationCard } from './InspirationCard';
import {
  INSPIRATION_LIBRARY, ALL_KINDS, KIND_LABELS,
  getTodayFeatured, getItemsByKind, getItemBySlug,
  type ItemKind,
} from '@/lib/inspiration/library';

const FETCH_BOOKMARKS = /* GraphQL */ `
  query MyBookmarks($user_id: uuid!) {
    inspiration_bookmarks(
      where: { user_id: { _eq: $user_id } }
      order_by: { created_at: desc }
    ) {
      item_slug
    }
  }
`;

export default async function InspirePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const t = await getTranslations('personal');

  const sp = await searchParams;
  const activeKind = sp.kind && (ALL_KINDS as readonly string[]).includes(sp.kind)
    ? (sp.kind as ItemKind)
    : null;

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { inspiration_bookmarks } = await client.request<{
    inspiration_bookmarks: Array<{ item_slug: string }>;
  }>(FETCH_BOOKMARKS, { user_id: session.user.id });

  const bookmarkedSlugs = new Set(inspiration_bookmarks.map((b) => b.item_slug));
  const bookmarkedItems = inspiration_bookmarks
    .map((b) => getItemBySlug(b.item_slug))
    .filter((i): i is NonNullable<ReturnType<typeof getItemBySlug>> => Boolean(i));

  const today = getTodayFeatured();

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-6 pt-2 pb-12">
      {/* Header */}
      <header className="mb-6">
        <div className="text-xs uppercase tracking-widest text-(--color-gold) mb-1">
          {t('inspire.eyebrow')}
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight">
          {t('inspire.title')}
        </h1>
        <p className="text-sm text-(--color-fg-muted) mt-2 max-w-xl">
          {t('inspire.intro')}
        </p>
      </header>

      {/* Today's featured */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
            ✦ {t('inspire.today')}
          </h2>
          <span className="text-xs text-(--color-fg-muted)">
            {t('inspire.changesDaily')}
          </span>
        </div>
        <InspirationCard item={today} variant="hero" />
      </section>

      {/* Bookmarks (if any) */}
      {bookmarkedItems.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
              ★ {t('inspire.bookmarks')}
              <span className="text-xs font-normal text-(--color-fg-muted)">
                {bookmarkedItems.length}
              </span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {bookmarkedItems.slice(0, 6).map((item) => (
              <InspirationCard key={item.slug} item={item} variant="compact" />
            ))}
          </div>
        </section>
      )}

      {/* Category filter pills */}
      <div className="-mx-5 px-5 md:mx-0 md:px-0 overflow-x-auto scrollbar-hide mb-6">
        <div className="flex gap-2 min-w-max md:flex-wrap">
          <CategoryPill href="/dashboard/inspire" label={t('inspire.all')} emoji="✦" active={!activeKind} />
          {ALL_KINDS.map((k) => {
            const meta = KIND_LABELS[k];
            return (
              <CategoryPill
                key={k}
                href={`/dashboard/inspire?kind=${k}`}
                label={meta.ru}
                emoji={meta.emoji}
                active={activeKind === k}
              />
            );
          })}
        </div>
      </div>

      {/* Library — by category or filtered */}
      {activeKind ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
              {KIND_LABELS[activeKind].emoji} {KIND_LABELS[activeKind].ru}
              <span className="text-xs font-normal text-(--color-fg-muted)">
                {getItemsByKind(activeKind).length}
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {getItemsByKind(activeKind).map((item) => (
              <InspirationCard key={item.slug} item={item} />
            ))}
          </div>
        </section>
      ) : (
        <div className="space-y-10">
          {ALL_KINDS.map((kind) => {
            const items = getItemsByKind(kind);
            if (items.length === 0) return null;
            const meta = KIND_LABELS[kind];
            return (
              <section key={kind}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
                    <span className="text-xl">{meta.emoji}</span>
                    {meta.ru}
                    <span className="text-xs font-normal text-(--color-fg-muted) ml-1">
                      {items.length}
                    </span>
                  </h2>
                  {items.length > 3 && (
                    <Link
                      href={`/dashboard/inspire?kind=${kind}`}
                      className="text-xs text-(--color-fg-muted) hover:text-(--color-deep)"
                    >
                      {t('inspire.seeAll')}
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.slice(0, 4).map((item) => (
                    <InspirationCard key={item.slug} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Library total */}
      <p className="text-center text-xs text-(--color-fg-subtle) mt-12">
        {t('inspire.libraryTotal', { count: INSPIRATION_LIBRARY.length })}
      </p>
    </div>
  );
}

function CategoryPill({
  href, label, emoji, active,
}: {
  href: string; label: string; emoji: string; active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'bg-(--color-deep) text-white border-(--color-deep)'
          : 'bg-(--color-bg-elevated) border-(--color-border) text-(--color-fg) hover:border-(--color-gold)/50'
      }`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </Link>
  );
}
