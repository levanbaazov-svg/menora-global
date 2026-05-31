// Connect — interest groups directory (prototype layout, compact).
// Header + category chips + "Мои группы" + category-grouped Discover.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { GroupCard, type GroupCardData } from './GroupCard';
import { EmptyState } from '@/app/_components/ui/EmptyState';
import {
  GROUP_CATEGORIES, GROUP_CATEGORY_LABELS, type GroupCategory,
} from '@/lib/groups/schema';

const FETCH = /* GraphQL */ `
  query ConnectFeed($community_id: uuid!, $user_id: uuid!) {
    my_memberships: group_memberships(
      where: { user_id: { _eq: $user_id }, left_at: { _is_null: true }, group: { archived_at: { _is_null: true } } }
      order_by: { joined_at: desc }
    ) {
      group {
        id category name description photo_url visibility
        frequency meeting_location member_count_cached is_ai_suggested tags community_id
      }
    }
    discover: interest_groups(
      where: {
        archived_at: { _is_null: true }
        _and: [
          { _or: [
            { community_id: { _eq: $community_id } }
            { community_id: { _is_null: true } }
            { visibility: { _eq: public } }
          ] }
          { _not: { memberships: { user_id: { _eq: $user_id }, left_at: { _is_null: true } } } }
        ]
      }
      order_by: [{ member_count_cached: desc }, { created_at: desc }]
      limit: 50
    ) {
      id category name description photo_url visibility
      frequency meeting_location member_count_cached is_ai_suggested tags community_id
    }
  }
`;

interface FetchResp {
  my_memberships: Array<{ group: Omit<GroupCardData, 'is_member'> }>;
  discover: Array<Omit<GroupCardData, 'is_member'>>;
}

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: GroupCategory }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const sp = await searchParams;
  const activeCat = sp.cat && (GROUP_CATEGORIES as readonly string[]).includes(sp.cat) ? sp.cat : null;

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const data = await client.request<FetchResp>(FETCH, {
    community_id: session.hasura.community_id,
    user_id: session.user.id,
  });

  const myGroups: GroupCardData[] = data.my_memberships
    .map((m) => ({ ...m.group, is_member: true }))
    .filter((g) => !activeCat || g.category === activeCat);

  const discover = (activeCat
    ? data.discover.filter((g) => g.category === activeCat)
    : data.discover
  ).map((g) => ({ ...g, is_member: false }));

  const discoverByCat = new Map<GroupCategory, GroupCardData[]>();
  for (const g of discover) {
    const arr = discoverByCat.get(g.category) ?? [];
    arr.push(g);
    discoverByCat.set(g.category, arr);
  }

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-8">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 mb-4 px-0.5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
            Связь
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Группы по интересам — в общине и по миру
          </p>
        </div>
        <Link
          href="/dashboard/connect/new"
          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold shadow-[var(--shadow-gold)] hover:opacity-95 active:scale-95 transition-all"
        >
          <Plus size={15} strokeWidth={2.4} /> Создать
        </Link>
      </header>

      {/* Category chips */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-hide mb-5">
        <div className="flex gap-2 min-w-max md:flex-wrap">
          <Chip href="/dashboard/connect" label="Все" active={!activeCat} />
          {GROUP_CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              href={`/dashboard/connect?cat=${cat}`}
              label={GROUP_CATEGORY_LABELS[cat].ru}
              active={activeCat === cat}
            />
          ))}
        </div>
      </div>

      {/* My groups */}
      {myGroups.length > 0 && (
        <section className="mb-7">
          <h2 className="font-serif text-base font-semibold mb-2.5 px-0.5">
            Мои группы <span className="text-xs font-normal text-muted-foreground">· {myGroups.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {myGroups.map((g, i) => <GroupCard key={g.id} g={g} index={i} />)}
          </div>
        </section>
      )}

      {/* Discover */}
      <section>
        <h2 className="font-serif text-base font-semibold mb-2.5 px-0.5">
          Найти группу <span className="text-xs font-normal text-muted-foreground">· {discover.length}</span>
        </h2>

        {discover.length === 0 && myGroups.length === 0 ? (
          <EmptyState
            emoji="✦"
            title="Пока нет групп"
            description="Создай первую группу и пригласи участников."
          />
        ) : activeCat ? (
          <div className="grid grid-cols-2 gap-2.5">
            {discover.map((g, i) => <GroupCard key={g.id} g={g} index={i} />)}
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(discoverByCat.entries()).map(([cat, items]) => (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    {GROUP_CATEGORY_LABELS[cat].ru}
                  </h3>
                  {items.length > 4 && (
                    <Link href={`/dashboard/connect?cat=${cat}`} className="text-xs text-primary hover:text-primary/80">
                      Все →
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {items.slice(0, 4).map((g, i) => <GroupCard key={g.id} g={g} index={i} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Chip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`shrink-0 inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
        active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-card border-border text-foreground/70 hover:border-primary/40 hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );
}
