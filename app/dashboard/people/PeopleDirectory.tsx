'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '../_Avatar';
import {
  displayName, DENOMINATION_LABELS, INTEREST_LABELS, ROLE_BADGES,
  type UserDisplay,
} from '@/lib/profile/display';

interface Row {
  id: string; user_id: string;
  role: 'member' | 'rabbi' | 'admin';
  joined_at: string | null; member_since: string | null;
  user: UserDisplay;
}

interface Props {
  members: Row[];
  selfId: string;
}

type RoleFilter = 'all' | 'admin' | 'rabbi';

export function PeopleDirectory({ members, selfId }: Props) {
  const [query, setQuery] = useState('');
  const [denomination, setDenomination] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  // Build set of unique denominations from actual member data
  const denominations = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      if (m.user.profile?.denomination) set.add(m.user.profile.denomination);
    }
    return Array.from(set).sort();
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (denomination && m.user.profile?.denomination !== denomination) return false;
      if (roleFilter === 'admin' && m.role !== 'admin') return false;
      if (roleFilter === 'rabbi' && m.role !== 'rabbi' && m.role !== 'admin') return false;
      if (!q) return true;
      const name = displayName(m.user).toLowerCase();
      const hebrew = m.user.profile?.hebrew_name?.toLowerCase() ?? '';
      const email = (m.user.email ?? '').toLowerCase();
      const bio = m.user.profile?.bio?.toLowerCase() ?? '';
      const interests = (m.user.profile?.interests ?? []).join(' ').toLowerCase();
      return name.includes(q) || hebrew.includes(q) || email.includes(q)
          || bio.includes(q) || interests.includes(q);
    });
  }, [members, query, denomination, roleFilter]);

  const hasFilters = query || denomination || roleFilter !== 'all';

  return (
    <>
      {/* Search bar */}
      <div className="mb-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-fg-muted) text-sm">🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени, интересам, bio..."
            className="w-full pl-10 pr-4 py-2.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-(--color-gold)"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-6 flex flex-wrap gap-2 items-center text-sm">
        <FilterChip
          label="Все"
          active={roleFilter === 'all' && !denomination}
          onClick={() => { setRoleFilter('all'); setDenomination(null); }}
        />
        <FilterChip
          label="🕯 Раввины"
          active={roleFilter === 'rabbi'}
          onClick={() => setRoleFilter(roleFilter === 'rabbi' ? 'all' : 'rabbi')}
        />
        {denominations.length > 1 && (
          <>
            <span className="text-(--color-fg-muted) text-xs">·</span>
            {denominations.map((d) => (
              <FilterChip
                key={d}
                label={DENOMINATION_LABELS[d] ?? d}
                active={denomination === d}
                onClick={() => setDenomination(denomination === d ? null : d)}
              />
            ))}
          </>
        )}
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setQuery(''); setDenomination(null); setRoleFilter('all'); }}
            className="text-xs text-(--color-fg-muted) hover:text-(--color-deep) underline ml-2"
          >
            Сбросить
          </button>
        )}
      </div>

      <p className="text-sm text-(--color-fg-muted) mb-4">
        {filtered.length === members.length
          ? `${members.length} ${members.length === 1 ? 'человек' : 'человек'}`
          : `Найдено ${filtered.length} из ${members.length}`}
      </p>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center text-(--color-fg-muted)">
          Никого не нашёл по запросу.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <PersonCard key={m.id} m={m} isSelf={m.user_id === selfId} />
          ))}
        </div>
      )}
    </>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-xs transition-colors ${
        active
          ? 'bg-(--color-gold) border-(--color-gold) text-(--color-deep) font-medium'
          : 'hover:border-(--color-gold)'
      }`}
    >
      {label}
    </button>
  );
}

function PersonCard({ m, isSelf }: { m: Row; isSelf: boolean }) {
  const href = isSelf ? '/dashboard/me' : `/dashboard/people/${m.user_id}`;
  const name = displayName(m.user);
  const interests = (m.user.profile?.interests ?? []).slice(0, 3);
  const roleBadge = ROLE_BADGES[m.role];

  return (
    <Link
      href={href}
      className="block border rounded-xl p-5 hover:border-(--color-gold) transition-colors"
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar user={m.user} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold truncate">{name}</h2>
            {isSelf && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-(--color-deep) text-white">Я</span>
            )}
          </div>
          {m.user.profile?.hebrew_name && (
            <p className="text-xs text-(--color-fg-muted) truncate">{m.user.profile.hebrew_name}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {m.role !== 'member' && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge.cls}`}>{roleBadge.label}</span>
            )}
            {m.user.profile?.denomination && (
              <span className="text-xs text-(--color-fg-muted)">
                {DENOMINATION_LABELS[m.user.profile.denomination] ?? m.user.profile.denomination}
              </span>
            )}
          </div>
        </div>
      </div>

      {interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {interests.map((i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-(--color-muted-bg) text-(--color-fg-muted)">
              {INTEREST_LABELS[i] ?? i}
            </span>
          ))}
          {(m.user.profile?.interests?.length ?? 0) > 3 && (
            <span className="text-xs text-(--color-fg-muted)">
              +{(m.user.profile?.interests?.length ?? 0) - 3}
            </span>
          )}
        </div>
      )}

      {m.user.profile?.bio && (
        <p className="text-sm text-(--color-fg-muted) mt-3 line-clamp-2">{m.user.profile.bio}</p>
      )}
    </Link>
  );
}
