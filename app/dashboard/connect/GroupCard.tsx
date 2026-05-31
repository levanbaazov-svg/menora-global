'use client';

// Interest-group card — prototype style: light pastel gradient, lucide icon
// chip top-left, AI badge top-right, compact title + meta. No emoji.

import Link from 'next/link';
import { motion } from 'motion/react';
import {
  BookOpen, Coffee, HeartPulse, Users2, ChefHat, Briefcase,
  Palette, Dumbbell, Plane, HandHeart, Sparkles, MapPin, CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import { type GroupCategory, type GroupVisibility } from '@/lib/groups/schema';

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

const CAT_META: Record<GroupCategory, { Icon: LucideIcon; tint: string }> = {
  learning:  { Icon: BookOpen,   tint: 'from-[oklch(0.97_0.03_95)] to-[oklch(0.94_0.06_88)]' },
  social:    { Icon: Coffee,     tint: 'from-[oklch(0.97_0.025_25)] to-[oklch(0.94_0.05_22)]' },
  wellness:  { Icon: HeartPulse, tint: 'from-[oklch(0.97_0.03_165)] to-[oklch(0.94_0.055_160)]' },
  family:    { Icon: Users2,     tint: 'from-[oklch(0.97_0.025_300)] to-[oklch(0.93_0.05_295)]' },
  cooking:   { Icon: ChefHat,    tint: 'from-[oklch(0.98_0.02_60)] to-[oklch(0.95_0.045_52)]' },
  business:  { Icon: Briefcase,  tint: 'from-[oklch(0.96_0.012_250)] to-[oklch(0.93_0.02_250)]' },
  arts:      { Icon: Palette,    tint: 'from-[oklch(0.97_0.03_330)] to-[oklch(0.94_0.05_330)]' },
  sports:    { Icon: Dumbbell,   tint: 'from-[oklch(0.97_0.025_235)] to-[oklch(0.94_0.045_232)]' },
  travel:    { Icon: Plane,      tint: 'from-[oklch(0.97_0.025_200)] to-[oklch(0.94_0.045_200)]' },
  volunteer: { Icon: HandHeart,  tint: 'from-[oklch(0.97_0.03_145)] to-[oklch(0.94_0.05_145)]' },
};

export function GroupCard({ g, index = 0 }: { g: GroupCardData; index?: number }) {
  const meta = CAT_META[g.category] ?? CAT_META.social;
  const Icon = meta.Icon;
  const metaLine = g.frequency ?? g.meeting_location ?? g.description ?? '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.03 * index }}
    >
      <Link
        href={`/dashboard/connect/${g.id}`}
        className={`
          group relative flex flex-col gap-2 rounded-2xl p-3.5 min-h-[124px]
          bg-gradient-to-br ${meta.tint}
          ring-1 ring-black/[0.03]
          shadow-[0_1px_3px_rgba(20,24,31,0.05)]
          transition-shadow duration-200 hover:shadow-[0_8px_22px_-6px_rgba(20,24,31,0.14)]
        `}
      >
        {/* Top row: icon chip + AI badge */}
        <div className="flex items-start justify-between">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 text-foreground/80 shadow-sm">
            <Icon size={16} strokeWidth={1.9} />
          </div>
          {g.is_ai_suggested && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-semibold text-background">
              <Sparkles size={9} strokeWidth={2.4} /> AI
            </span>
          )}
        </div>

        {/* Title + meta */}
        <div className="flex-1">
          <h3 className="font-serif text-[15px] font-semibold leading-[1.15] tracking-tight line-clamp-2">
            {g.name}
          </h3>
          {metaLine && (
            <p className="text-[11px] text-foreground/55 mt-0.5 leading-snug line-clamp-1">
              {metaLine}
            </p>
          )}
        </div>

        {/* Footer: members + membership tick */}
        <div className="flex items-center gap-2 text-[11px] text-foreground/55">
          <span className="inline-flex items-center gap-1">
            <Users2 size={12} strokeWidth={2} />
            {g.member_count_cached}
          </span>
          {!g.community_id && (
            <span className="inline-flex items-center gap-0.5 text-foreground/45">
              <MapPin size={11} strokeWidth={2} /> Global
            </span>
          )}
          {g.is_member && (
            <span className="ml-auto inline-flex items-center rounded-full bg-foreground/85 px-1.5 py-0.5 text-[9px] font-semibold text-background">
              ✓
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
