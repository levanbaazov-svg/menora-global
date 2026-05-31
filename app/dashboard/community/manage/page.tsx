// Staff (rabbi/admin) management hub for community content.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
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
        ← В город-гид
      </Link>

      <header className="mb-8">
        <div className="text-xs uppercase tracking-widest text-(--color-gold) mb-1">
          Управление общиной
        </div>
        <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
          Что добавить?
        </h1>
        <p className="text-sm text-(--color-fg-muted) mt-2 max-w-xl">
          Чем больше ты заполнишь — тем полезнее city-guide для туристов и переехавших.
          Начни с того что у тебя точно есть в городе.
        </p>
      </header>

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
                {pendingCount} {pendingCount === 1 ? 'заявка ждёт' : 'заявок ждёт'} модерации
              </div>
              <div className="text-xs text-(--color-fg-muted)">Места предложенные участниками</div>
            </div>
            <span className="text-(--color-warning)">→</span>
          </div>
        </Link>
      )}

      {/* Places by type */}
      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold mb-4">📍 Места</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PLACE_TYPES.map((t) => {
            const meta = PLACE_TYPE_LABELS[t];
            const cnt = placeCounts[t] ?? 0;
            return (
              <Link
                key={t}
                href={`/dashboard/community/places/new?type=${t}`}
                className="block rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 p-4 hover:border-(--color-gold)/40 hover:shadow-[var(--shadow-md)] transition-all"
              >
                <div className="text-3xl mb-2">{meta.emoji}</div>
                <div className="font-semibold text-sm">{meta.ru}</div>
                <div className="text-xs text-(--color-fg-muted) mt-1">
                  {cnt > 0 ? `${cnt} ${cnt === 1 ? 'место' : 'мест'} · добавить ещё` : 'Добавить первое'}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Programs */}
      <section>
        <h2 className="font-serif text-xl font-semibold mb-4">📖 Программы</h2>
        <p className="text-sm text-(--color-fg-muted) mb-4">
          {programsCount > 0
            ? `${programsCount} активных · добавь ещё`
            : 'Программ пока нет. Создай первую — Hebrew School, Couples Learning, Torah & Pizza.'}
        </p>
        <Link
          href="/dashboard/community/programs/new"
          className="inline-block px-5 py-2.5 rounded-full bg-(--color-deep) text-white text-sm font-semibold hover:opacity-90"
        >
          + Создать программу
        </Link>
        {programsCount > 0 && (
          <div className="mt-6">
            <h3 className="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-3">Категории</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PROGRAM_CATEGORY_LABELS).map(([key, val]) => (
                <Link
                  key={key}
                  href={`/dashboard/community/programs/new?category=${key}`}
                  className="text-xs px-3 py-1.5 rounded-full border hover:border-(--color-gold)"
                >
                  {val.emoji} {val.ru}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
