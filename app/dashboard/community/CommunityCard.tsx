'use client';

// Community feed card — hero photo + name + location + denomination + members.
// Used in the Discover feed (vertical scroll).

import Link from 'next/link';
import { MapPin, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';

export interface CommunityCardData {
  slug: string;
  name: string;
  city: string | null;
  country_code: string | null;
  denomination: string | null;
  hero_image_url: string | null;
  member_count_cached: number;
  description: string | null;
  isMine?: boolean;
}

function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export function CommunityCard({ c, index = 0 }: { c: CommunityCardData; index?: number }) {
  const t = useTranslations('communityMisc');
  // Always link to the specific community by slug. The c/[slug] page renders the
  // full profile and (for your active community) redirects to the member view, so
  // each card opens its OWN community instead of the active one.
  const href = `/dashboard/community/c/${c.slug}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: 0.04 * index }}
    >
      <Link
        href={href}
        className="
          group block overflow-hidden rounded-2xl bg-card ring-1 ring-border/70
          shadow-[0_1px_3px_rgba(20,24,31,0.05)]
          transition-shadow duration-200 hover:shadow-[0_10px_28px_-6px_rgba(20,24,31,0.14)]
        "
      >
        {/* Hero */}
        <div className="relative h-40 overflow-hidden">
          {c.hero_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.hero_image_url}
              alt={c.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/30 to-foreground/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

          {/* Badges */}
          {c.isMine && (
            <span className="absolute top-3 left-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
              {t('myCommunity')}
            </span>
          )}
          {c.denomination && !c.isMine && (
            <span className="absolute top-3 left-3 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-foreground backdrop-blur">
              {c.denomination}
            </span>
          )}

          {/* Title block on photo */}
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <h3 className="font-serif text-lg font-semibold leading-tight drop-shadow-sm">
              {c.name}
            </h3>
            <div className="mt-1 flex items-center gap-3 text-xs text-white/90">
              {(c.city || c.country_code) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} strokeWidth={2} />
                  {[c.city, c.country_code].filter(Boolean).join(', ')}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users size={12} strokeWidth={2} />
                {fmtCount(c.member_count_cached)}
              </span>
            </div>
          </div>
        </div>

        {/* Description — padding on the wrapper, clamp on a padding-free inner
            element (webkit-line-clamp + bottom padding leaks the next line). */}
        {c.description && (
          <div className="px-4 pt-2.5 pb-3.5">
            <p
              className="text-[13px] leading-relaxed text-foreground/70 overflow-hidden"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                maxHeight: 'calc(2 * 1.625em)',
              }}
            >
              {c.description}
            </p>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
