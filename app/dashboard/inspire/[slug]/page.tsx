// Inspiration item detail page — body, quote, CTAs, bookmark.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getItemBySlug, KIND_LABELS, INSPIRATION_LIBRARY, type InspirationItem } from '@/lib/inspiration/library';
import { BookmarkButton } from '../BookmarkButton';
import { InspirationCard } from '../InspirationCard';

const FETCH_BOOKMARK = /* GraphQL */ `
  query MyBookmark($user_id: uuid!, $slug: String!) {
    inspiration_bookmarks(
      where: {
        user_id: { _eq: $user_id }
        item_slug: { _eq: $slug }
      }
      limit: 1
    ) { id }
  }
`;

export default async function InspireDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const { slug } = await params;
  const item = getItemBySlug(slug);
  if (!item) notFound();

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { inspiration_bookmarks } = await client.request<{
    inspiration_bookmarks: Array<{ id: string }>;
  }>(FETCH_BOOKMARK, { user_id: session.user.id, slug });
  const isBookmarked = inspiration_bookmarks.length > 0;

  const meta = KIND_LABELS[item.kind];

  // Related: same kind, exclude current
  const related: InspirationItem[] = INSPIRATION_LIBRARY
    .filter((i) => i.kind === item.kind && i.slug !== item.slug)
    .slice(0, 3);

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-6 pt-2 pb-12">
      <Link
        href="/dashboard/inspire"
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← Inspire
      </Link>

      {/* Hero */}
      <section className="-mx-5 md:mx-0 mb-8">
        <div
          className={`relative bg-gradient-to-br ${item.gradient} text-white px-5 md:px-10 py-10 md:py-14 md:rounded-3xl overflow-hidden`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs uppercase tracking-widest bg-white/90 text-(--color-deep) px-2.5 py-1 rounded-full font-medium">
                {meta.emoji} {meta.ru}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-white font-medium">
                {item.readingTimeMinutes} мин чтения
              </span>
            </div>
            <div className="text-5xl md:text-6xl mb-4 drop-shadow-lg">{item.emoji}</div>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight drop-shadow-md max-w-2xl">
              {item.title}
            </h1>
            {item.subtitle && (
              <p className="text-base md:text-lg opacity-95 mt-2 max-w-xl">{item.subtitle}</p>
            )}
          </div>
        </div>
      </section>

      {/* Bookmark + meta row */}
      <div className="flex items-center justify-between mb-8">
        <p className="text-(--color-fg-muted) leading-relaxed text-base italic">
          {item.teaser}
        </p>
        <div className="shrink-0 ml-4">
          <BookmarkButton slug={item.slug} initiallyBookmarked={isBookmarked} />
        </div>
      </div>

      {/* Body */}
      <article className="prose-content space-y-5 text-(--color-fg) leading-relaxed">
        {renderBody(item.body)}
      </article>

      {/* Quote */}
      {item.quote && (
        <blockquote className="mt-10 border-l-4 border-(--color-gold) bg-(--color-gold-soft)/40 pl-5 pr-4 py-4 rounded-r-2xl">
          <p className="font-serif text-lg italic leading-relaxed">«{item.quote.text}»</p>
          <p className="text-xs text-(--color-fg-muted) mt-2 uppercase tracking-wider">
            — {item.quote.source}
          </p>
        </blockquote>
      )}

      {/* CTAs */}
      {item.cta && item.cta.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-3">
            Что дальше
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {item.cta.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="flex items-center justify-between rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 hover:border-(--color-gold)/40 px-4 py-3 transition-colors group"
              >
                <span className="text-sm font-medium">{c.label}</span>
                <span className="text-(--color-fg-muted) group-hover:text-(--color-deep) transition-colors">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {item.tags.map((t) => (
            <span
              key={t}
              className="text-xs px-2.5 py-1 rounded-full border border-(--color-border) text-(--color-fg-muted)"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12 border-t border-(--color-border) pt-8">
          <h3 className="font-serif text-lg font-semibold mb-4">
            Ещё в категории «{meta.ru}»
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {related.map((r) => (
              <InspirationCard key={r.slug} item={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Tiny markdown-lite renderer ─────────────────────────────────────────────
// We don't want a full markdown dep just for **bold** and paragraphs.
// Supports: paragraphs (split by \n\n), **bold**, --- horizontal rule,
// lines starting with > as a sub-quote, "—" as em-dash list bullets.
function renderBody(body: string): React.ReactNode {
  const paragraphs = body.split(/\n\n+/);
  return paragraphs.map((p, i) => {
    const trimmed = p.trim();
    if (trimmed === '---') {
      return <hr key={i} className="my-6 border-(--color-border)" />;
    }
    if (trimmed.startsWith('> ')) {
      return (
        <blockquote key={i} className="border-l-2 border-(--color-fg-subtle) pl-4 italic text-(--color-fg-muted)">
          {renderInline(trimmed.slice(2))}
        </blockquote>
      );
    }
    // List of em-dash bullets — if every line starts with "—"
    const lines = trimmed.split(/\n/);
    if (lines.length > 1 && lines.every((l) => l.trim().startsWith('—'))) {
      return (
        <ul key={i} className="space-y-2 list-none">
          {lines.map((l, j) => (
            <li key={j} className="leading-relaxed">{renderInline(l.trim().slice(1).trim())}</li>
          ))}
        </ul>
      );
    }
    return <p key={i} className="leading-relaxed">{renderInline(trimmed)}</p>;
  });
}

function renderInline(text: string): React.ReactNode {
  // Split by ** … ** and turn into <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i} className="font-semibold text-(--color-deep)">{p.slice(2, -2)}</strong>;
    }
    // Italic *…* (single asterisks) — only if not adjacent **
    const italicParts = p.split(/(\*[^*\n]+\*)/g);
    return italicParts.map((q, j) => {
      if (q.startsWith('*') && q.endsWith('*') && q.length > 2) {
        return <em key={`${i}-${j}`} className="italic">{q.slice(1, -1)}</em>;
      }
      return <span key={`${i}-${j}`}>{q}</span>;
    });
  });
}
