// Reusable card for an interest group — photo overlay + meta + (optional) join hint.

import Link from 'next/link';
import {
  GROUP_CATEGORY_LABELS, VISIBILITY_LABELS,
  type GroupCategory, type GroupVisibility,
} from '@/lib/groups/schema';

export interface GroupCardData {
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
  is_member?: boolean;
}

export function GroupCard({ g }: { g: GroupCardData }) {
  const meta = GROUP_CATEGORY_LABELS[g.category];
  return (
    <Link
      href={`/dashboard/connect/${g.id}`}
      className="group block rounded-2xl overflow-hidden bg-(--color-bg-elevated) border border-(--color-border)/60 hover:border-(--color-gold)/40 hover:shadow-[var(--shadow-md)] transition-all"
    >
      {/* Header photo or gradient */}
      <div
        className={`relative h-32 ${g.photo_url ? '' : `bg-gradient-to-br ${meta.gradient}`}`}
        style={g.photo_url ? { background: `url(${g.photo_url}) center/cover no-repeat` } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Category pill */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/85 backdrop-blur text-xs font-medium text-(--color-deep) shadow-sm">
          <span>{meta.emoji}</span>
          <span>{meta.ru}</span>
        </div>

        {/* AI badge */}
        {g.is_ai_suggested && (
          <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-(--color-gold) text-(--color-deep) font-semibold">
            AI
          </div>
        )}

        {/* Member chip on photo */}
        <div className="absolute bottom-2 left-2 text-xs text-white/95 font-medium flex items-center gap-1">
          👥 {g.member_count_cached}
          {g.is_member && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-(--color-gold) text-(--color-deep) text-[10px] font-semibold">
              ✓ Я
            </span>
          )}
        </div>

        {/* Global badge (group not tied to a community) */}
        {!g.community_id && (
          <div className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-black/55 text-white font-medium">
            🌍 Global
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-serif text-base font-semibold leading-snug line-clamp-2 group-hover:text-(--color-deep)">
          {g.name}
        </h3>
        {g.description && (
          <p className="text-xs text-(--color-fg-muted) mt-1.5 line-clamp-2">
            {g.description}
          </p>
        )}

        {(g.frequency || g.meeting_location) && (
          <div className="mt-2.5 text-[11px] text-(--color-fg-subtle) flex flex-wrap gap-x-2 gap-y-0.5">
            {g.frequency && <span>🗓 {g.frequency}</span>}
            {g.meeting_location && <span>📍 {g.meeting_location}</span>}
          </div>
        )}

        {g.visibility !== 'community' && (
          <div className="mt-2 text-[10px] uppercase tracking-wider text-(--color-fg-subtle)">
            {VISIBILITY_LABELS[g.visibility].ru}
          </div>
        )}
      </div>
    </Link>
  );
}
