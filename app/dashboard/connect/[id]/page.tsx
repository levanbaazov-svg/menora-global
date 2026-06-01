// Group detail — meta, members preview, join/leave + admin tools.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  GROUP_CATEGORY_LABELS, VISIBILITY_LABELS,
  type GroupCategory, type GroupVisibility,
} from '@/lib/groups/schema';
import { JoinLeaveButton } from '../JoinLeaveButton';
import { ArchiveGroupButton } from './ArchiveGroupButton';

const FETCH = /* GraphQL */ `
  query GroupDetail($id: uuid!, $user_id: uuid!) {
    interest_groups_by_pk(id: $id) {
      id category name description photo_url visibility
      frequency meeting_location member_count_cached is_ai_suggested
      tags community_id created_at archived_at
      created_by_user_id
      community { id slug name city country_code }
      creator { id name image: image_url }
      meeting_place { id name address }
    }

    memberships: group_memberships(
      where: {
        group_id: { _eq: $id }
        left_at: { _is_null: true }
      }
      order_by: [{ role: asc }, { joined_at: asc }]
      limit: 30
    ) {
      id role joined_at
      user { id name image: image_url }
    }

    my_membership: group_memberships(
      where: {
        group_id: { _eq: $id }
        user_id: { _eq: $user_id }
        left_at: { _is_null: true }
      }
      limit: 1
    ) { id role }
  }
`;

interface Resp {
  interest_groups_by_pk: {
    id: string;
    category: GroupCategory;
    name: string;
    description: string | null;
    photo_url: string | null;
    visibility: GroupVisibility;
    frequency: string | null;
    meeting_location: string | null;
    member_count_cached: number;
    is_ai_suggested: boolean;
    tags: string[];
    community_id: string | null;
    created_at: string;
    archived_at: string | null;
    created_by_user_id: string | null;
    community: { id: string; slug: string; name: string; city: string | null; country_code: string | null } | null;
    creator: { id: string; name: string | null; image: string | null } | null;
    meeting_place: { id: string; name: string; address: string | null } | null;
  } | null;
  memberships: Array<{
    id: string; role: 'member' | 'admin'; joined_at: string;
    user: { id: string; name: string | null; image: string | null } | null;
  }>;
  my_membership: Array<{ id: string; role: 'member' | 'admin' }>;
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const { id } = await params;
  const userId = session.user.id;
  const role = session.hasura.default_role;

  const client = await hasuraAsCurrentUser({ role });
  const data = await client.request<Resp>(FETCH, { id, user_id: userId });

  const g = data.interest_groups_by_pk;
  if (!g || g.archived_at) notFound();

  const meta = GROUP_CATEGORY_LABELS[g.category];
  const myMembership = data.my_membership[0] ?? null;
  const isMember = Boolean(myMembership);
  const isMyGroup = g.created_by_user_id === userId;
  const isGroupAdmin = myMembership?.role === 'admin' || isMyGroup;
  const isStaff = role === 'rabbi' || role === 'admin';
  const canArchive = isGroupAdmin || isStaff;

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-6 pt-2 pb-12">
      <Link
        href="/dashboard/connect"
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← К группам
      </Link>

      {/* Hero */}
      <section className="-mx-5 md:mx-0 mb-6">
        <div
          className={`relative h-56 md:h-64 md:rounded-2xl overflow-hidden flex items-end p-5 md:p-7 text-white ${
            g.photo_url ? '' : `bg-gradient-to-br ${meta.gradient}`
          }`}
          style={g.photo_url ? { background: `url(${g.photo_url}) center/cover no-repeat` } : undefined}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-widest bg-white/85 text-(--color-deep) px-2 py-1 rounded-full font-medium">
                {meta.emoji} {meta.ru}
              </span>
              {g.is_ai_suggested && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-(--color-gold) text-(--color-deep) font-semibold">
                  AI Suggested
                </span>
              )}
              {!g.community_id && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-white/20 backdrop-blur text-white font-medium">
                  🌍 Global
                </span>
              )}
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight">
              {g.name}
            </h1>
            <div className="flex items-center gap-3 text-sm opacity-90 mt-2">
              <span>👥 {g.member_count_cached} участников</span>
              {g.community && (
                <span>· {g.community.name}{g.community.city ? `, ${g.community.city}` : ''}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Action row */}
      <div className="mb-7 flex flex-wrap items-center gap-3">
        <JoinLeaveButton groupId={g.id} isMember={isMember} />
        {isGroupAdmin && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-(--color-gold-soft) text-(--color-gold-dark) font-medium">
            ⭐ Админ
          </span>
        )}
      </div>

      {/* Meta */}
      <section className="grid sm:grid-cols-2 gap-3 mb-8">
        {g.frequency && (
          <MetaCard emoji="🗓" label="Расписание" value={g.frequency} />
        )}
        {g.meeting_place ? (
          <MetaCard
            emoji="📍" label="Место"
            value={g.meeting_place.name}
            sub={g.meeting_place.address ?? undefined}
          />
        ) : g.meeting_location ? (
          <MetaCard emoji="📍" label="Место" value={g.meeting_location} />
        ) : null}
        <MetaCard
          emoji="🔒" label="Доступ"
          value={VISIBILITY_LABELS[g.visibility].ru}
          sub={VISIBILITY_LABELS[g.visibility].hint}
        />
        {g.creator && (
          <MetaCard
            emoji="✦" label="Создатель"
            value={g.creator.name ?? 'Без имени'}
          />
        )}
      </section>

      {/* Description */}
      {g.description && (
        <section className="mb-8">
          <h2 className="font-serif text-lg font-semibold mb-2">О группе</h2>
          <p className="text-sm text-(--color-fg) whitespace-pre-wrap leading-relaxed">
            {g.description}
          </p>
        </section>
      )}

      {/* Tags */}
      {g.tags.length > 0 && (
        <section className="mb-8">
          <div className="flex flex-wrap gap-2">
            {g.tags.map((t) => (
              <span
                key={t}
                className="text-xs px-2.5 py-1 rounded-full border border-(--color-border) text-(--color-fg-muted)"
              >
                #{t}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Members preview */}
      <section className="mb-8">
        <h2 className="font-serif text-lg font-semibold mb-3 flex items-center gap-2">
          👥 Участники
          <span className="text-xs font-normal text-(--color-fg-muted)">
            {g.member_count_cached}
          </span>
        </h2>

        {data.memberships.length === 0 ? (
          <p className="text-sm text-(--color-fg-muted)">Пока никого. Будь первым!</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {data.memberships.map((m) => (
              <div key={m.id} className="text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-(--color-muted-bg) overflow-hidden flex items-center justify-center text-lg font-semibold text-(--color-deep) ring-2 ring-(--color-bg-elevated)">
                  {m.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.user.image} alt={m.user.name ?? ''} className="w-full h-full object-cover" />
                  ) : (
                    (m.user?.name ?? '?').slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="text-[11px] mt-1.5 truncate" title={m.user?.name ?? ''}>
                  {m.user?.name ?? 'Без имени'}
                </div>
                {m.role === 'admin' && (
                  <div className="text-[9px] text-(--color-gold-dark) font-semibold mt-0.5">АДМИН</div>
                )}
              </div>
            ))}
          </div>
        )}
        {g.member_count_cached > data.memberships.length && (
          <p className="text-xs text-(--color-fg-subtle) mt-3">
            Показаны первые {data.memberships.length} из {g.member_count_cached}.
          </p>
        )}
      </section>

      {/* Chat placeholder */}
      <section className="mb-8">
        <div className="rounded-2xl border border-dashed border-(--color-border) p-5 text-center">
          <div className="text-3xl opacity-50 mb-2">💬</div>
          <div className="font-medium text-sm">Чат группы — скоро</div>
          <p className="text-xs text-(--color-fg-muted) mt-1 max-w-sm mx-auto">
            Сейчас договаривайтесь о встречах в общих чатах вашей общины. Real-time чат прямо
            внутри группы — в v1.1.
          </p>
        </div>
      </section>

      {/* Admin tools */}
      {canArchive && (
        <section className="mt-10 border-t border-(--color-border) pt-6">
          <h3 className="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-3">
            Управление
          </h3>
          <ArchiveGroupButton groupId={g.id} />
        </section>
      )}
    </div>
  );
}

function MetaCard({
  emoji, label, value, sub,
}: {
  emoji: string; label: string; value: string; sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 p-4">
      <div className="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-1 flex items-center gap-1">
        <span>{emoji}</span> {label}
      </div>
      <div className="font-medium text-sm">{value}</div>
      {sub && <div className="text-xs text-(--color-fg-muted) mt-0.5">{sub}</div>}
    </div>
  );
}
