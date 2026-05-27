// Connect tab — interest-groups directory.
// Sections: "My groups" + "Discover" grouped by category.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { GroupCard, type GroupCardData } from './GroupCard';
import { EmptyState } from '@/app/_components/ui/EmptyState';
import { LinkButton } from '@/app/_components/ui/Button';
import {
  GROUP_CATEGORIES, GROUP_CATEGORY_LABELS, type GroupCategory,
} from '@/lib/groups/schema';

const FETCH = /* GraphQL */ `
  query ConnectFeed($community_id: uuid!, $user_id: uuid!) {
    my_memberships: group_memberships(
      where: {
        user_id: { _eq: $user_id }
        left_at: { _is_null: true }
        group: { archived_at: { _is_null: true } }
      }
      order_by: { joined_at: desc }
    ) {
      id
      role
      group {
        id category name description photo_url visibility
        frequency meeting_location member_count_cached is_ai_suggested tags
        community_id
      }
    }

    discover: interest_groups(
      where: {
        archived_at: { _is_null: true }
        _and: [
          {
            _or: [
              { community_id: { _eq: $community_id } }
              { community_id: { _is_null: true } }
              { visibility: { _eq: public } }
            ]
          }
          {
            _not: {
              memberships: {
                user_id: { _eq: $user_id }
                left_at: { _is_null: true }
              }
            }
          }
        ]
      }
      order_by: [{ member_count_cached: desc }, { created_at: desc }]
      limit: 50
    ) {
      id category name description photo_url visibility
      frequency meeting_location member_count_cached is_ai_suggested tags
      community_id
    }
  }
`;

interface FetchResp {
  my_memberships: Array<{
    id: string;
    role: 'member' | 'admin';
    group: Omit<GroupCardData, 'is_member'>;
  }>;
  discover: Array<Omit<GroupCardData, 'is_member'>>;
}

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: GroupCategory }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const userId = session.user.id;
  const communityId = session.hasura.community_id;
  const role = session.hasura.default_role;

  const sp = await searchParams;
  const activeCat = sp.cat && (GROUP_CATEGORIES as readonly string[]).includes(sp.cat) ? sp.cat : null;

  const client = await hasuraAsCurrentUser({ role });
  const data = await client.request<FetchResp>(FETCH, {
    community_id: communityId,
    user_id: userId,
  });

  const myGroups: GroupCardData[] = data.my_memberships.map((m) => ({
    ...m.group, is_member: true,
  }));

  const discoverFiltered = activeCat
    ? data.discover.filter((g) => g.category === activeCat)
    : data.discover;

  // Group "discover" by category for category-grouped layout
  const discoverByCat = new Map<GroupCategory, GroupCardData[]>();
  for (const g of discoverFiltered) {
    const arr = discoverByCat.get(g.category) ?? [];
    arr.push({ ...g, is_member: false });
    discoverByCat.set(g.category, arr);
  }

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-6 pt-2 pb-12">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <div className="text-xs uppercase tracking-widest text-(--color-gold) mb-1">
              Связь
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight">
              Группы по интересам
            </h1>
          </div>
          <LinkButton href="/dashboard/connect/new" variant="gold" size="sm">
            + Создать
          </LinkButton>
        </div>
        <p className="text-sm text-(--color-fg-muted) mt-2 max-w-xl">
          Учёба, спорт, кулинария, мамы&nbsp;— найди людей с похожими интересами в общине или по всему миру.
        </p>
      </header>

      {/* Category filter pills */}
      <div className="-mx-5 px-5 md:mx-0 md:px-0 overflow-x-auto scrollbar-hide mb-6">
        <div className="flex gap-2 min-w-max md:flex-wrap">
          <CategoryPill href="/dashboard/connect" label="Все" emoji="✦" active={!activeCat} />
          {GROUP_CATEGORIES.map((c) => {
            const meta = GROUP_CATEGORY_LABELS[c];
            return (
              <CategoryPill
                key={c}
                href={`/dashboard/connect?cat=${c}`}
                label={meta.ru}
                emoji={meta.emoji}
                active={activeCat === c}
              />
            );
          })}
        </div>
      </div>

      {/* My groups */}
      <section className="mb-10">
        <h2 className="font-serif text-xl font-semibold mb-3 flex items-center gap-2">
          ⭐ Мои группы
          <span className="text-xs font-normal text-(--color-fg-muted)">
            {myGroups.length}
          </span>
        </h2>

        {myGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-(--color-border) p-5 text-sm text-(--color-fg-muted)">
            Ты ещё ни в одной группе. Открой «Discover» ниже или создай свою.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {myGroups
              .filter((g) => !activeCat || g.category === activeCat)
              .map((g) => <GroupCard key={g.id} g={g} />)}
          </div>
        )}
      </section>

      {/* Discover — grouped by category */}
      <section>
        <h2 className="font-serif text-xl font-semibold mb-3 flex items-center gap-2">
          🔍 Discover
          <span className="text-xs font-normal text-(--color-fg-muted)">
            {discoverFiltered.length}
          </span>
        </h2>

        {discoverFiltered.length === 0 ? (
          <EmptyState
            emoji="✦"
            title={
              activeCat
                ? `Пока нет групп в категории «${GROUP_CATEGORY_LABELS[activeCat].ru}»`
                : 'Пока нет групп для discovery'
            }
            description="Будь первым — создай группу и пригласи участников."
            action={<LinkButton href="/dashboard/connect/new" variant="gold" size="sm">Создать группу</LinkButton>}
          />
        ) : activeCat ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {discoverFiltered.map((g) => <GroupCard key={g.id} g={{ ...g, is_member: false }} />)}
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(discoverByCat.entries()).map(([cat, items]) => {
              const meta = GROUP_CATEGORY_LABELS[cat];
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-serif text-base font-semibold flex items-center gap-2">
                      <span className="text-lg">{meta.emoji}</span>
                      {meta.ru}
                      <span className="text-xs font-normal text-(--color-fg-muted) ml-1">
                        {items.length}
                      </span>
                    </h3>
                    <Link
                      href={`/dashboard/connect?cat=${cat}`}
                      className="text-xs text-(--color-fg-muted) hover:text-(--color-deep)"
                    >
                      Все →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {items.slice(0, 4).map((g) => <GroupCard key={g.id} g={g} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
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
