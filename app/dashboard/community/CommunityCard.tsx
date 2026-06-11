'use client';

// Community card — вертикальный постер (фото на всю карточку): бейдж
// «моя община»/конфессия, счётчик участников, имя + город + описание на фото.
// Используется в Discover (сетка 2 колонки).

import Link from 'next/link';
import { MapPin, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { MotifFallback } from '@/app/_components/ui/MotifFallback';

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
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: 0.03 * (index % 8) }}
    >
      <Link
        href={href}
        className="
          group relative block aspect-[3/4] overflow-hidden rounded-2xl
          ring-1 ring-border/60
          hover:ring-primary/40 hover:shadow-[0_12px_30px_-8px_rgba(20,24,31,0.22)]
          transition-all
        "
      >
        {/* Фото на всю карточку */}
        <div className="absolute inset-0">
          {c.hero_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.hero_image_url}
              alt={c.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <MotifFallback variant="community" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />
        </div>

        {/* Бейдж слева: моя община / конфессия */}
        {c.isMine ? (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-primary px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
            {t('myCommunity')}
          </span>
        ) : c.denomination ? (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-foreground shadow-sm">
            {c.denomination}
          </span>
        ) : null}

        {/* Участники справа */}
        <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/35 backdrop-blur px-2 py-1 text-[10px] font-semibold text-white">
          <Users size={11} strokeWidth={2.2} />
          {fmtCount(c.member_count_cached)}
        </span>

        {/* Низ: имя + город + описание */}
        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <h3 className="font-serif text-[15px] font-semibold leading-snug drop-shadow-sm line-clamp-2">
            {c.name}
          </h3>
          {(c.city || c.country_code) && (
            <div className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-white/85">
              <MapPin size={11} strokeWidth={2} />
              {[c.city, c.country_code].filter(Boolean).join(', ')}
            </div>
          )}
          {c.description && (
            <p className="mt-1 text-[10.5px] leading-snug text-white/75 line-clamp-2">
              {c.description}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
