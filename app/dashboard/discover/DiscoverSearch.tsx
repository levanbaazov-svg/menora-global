'use client';

// Full-screen-ish global search. Debounced fetch to /api/search, grouped
// results with lucide icons. Empty state shows visual category tiles.

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import {
  Search, X, Building2, BookOpenText, CalendarDays, MessageCircle, HandHeart,
  UserRound, ChevronRight, MapPin, Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LOCALE_BCP47, type Locale } from '@/i18n/config';
import { PLACE_TYPE_LABELS, type PlaceType } from '@/lib/places/schema';

interface Results {
  communities: Array<{ slug: string; name: string; city: string | null; country_code: string | null; denomination: string | null; member_count_cached: number }>;
  programs: Array<{ id: string; name: string; schedule_text: string | null }>;
  places: Array<{ id: string; name: string; type: PlaceType; address: string | null }>;
  events: Array<{ id: string; title: string; starts_at: string; location_text: string | null }>;
  interest_groups: Array<{ id: string; name: string; member_count_cached: number }>;
  requests: Array<{ id: string; title: string; category: string }>;
  people: Array<{ id: string; name: string | null; image_url: string | null }>;
}

const EMPTY: Results = { communities: [], programs: [], places: [], events: [], interest_groups: [], requests: [], people: [] };

const TILES: Array<{ key: string; href: string; Icon: LucideIcon; grad: string }> = [
  { key: 'communities', href: '/dashboard/community/discover', Icon: Building2,     grad: 'from-amber-300 to-orange-500' },
  { key: 'guide',       href: '/dashboard/community?tab=guide', Icon: MapPin,        grad: 'from-emerald-300 to-teal-500' },
  { key: 'events',      href: '/dashboard/events',             Icon: CalendarDays,  grad: 'from-violet-300 to-purple-500' },
  { key: 'groups',      href: '/dashboard/connect',            Icon: MessageCircle, grad: 'from-sky-300 to-blue-500' },
  { key: 'requests',    href: '/dashboard/requests',           Icon: HandHeart,     grad: 'from-rose-300 to-pink-500' },
  { key: 'people',      href: '/dashboard/people',             Icon: UserRound,     grad: 'from-fuchsia-300 to-pink-500' },
  { key: 'aiRabbi',     href: '/dashboard/ai-rabbi',           Icon: Sparkles,      grad: 'from-yellow-300 to-amber-500' },
  { key: 'inspire',     href: '/dashboard/inspire',            Icon: BookOpenText,  grad: 'from-cyan-300 to-blue-400' },
];

export function DiscoverSearch() {
  const t = useTranslations('discover');
  const locale = useLocale() as Locale;
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setResults(EMPTY); setLoading(false); return; }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const data = await r.json();
        setResults({ ...EMPTY, ...data });
      } catch { /* ignore */ } finally { setLoading(false); }
    }, 280);
    return () => clearTimeout(id);
  }, [q]);

  const total =
    results.communities.length + results.programs.length + results.places.length + results.events.length +
    results.interest_groups.length + results.requests.length + results.people.length;
  const hasQuery = q.trim().length >= 2;

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-32">
      {/* Search input */}
      <div className="relative mb-5">
        <Search size={18} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('placeholder')}
          className="w-full h-12 ps-11 pe-10 rounded-2xl bg-card ring-1 ring-border text-base outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* No query → visual category tiles */}
      {!hasQuery && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-2.5 px-0.5">
            {t('browse')}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {TILES.map((tile) => (
              <Link
                key={tile.key}
                href={tile.href}
                className={`group relative overflow-hidden rounded-2xl p-4 h-24 flex flex-col justify-between bg-gradient-to-br ${tile.grad} text-white shadow-[0_1px_3px_rgba(20,24,31,0.06)] hover:shadow-[0_8px_20px_-6px_rgba(20,24,31,0.18)] transition-shadow`}
              >
                <tile.Icon size={20} strokeWidth={2} className="opacity-95" />
                <div>
                  <div className="font-semibold text-sm leading-tight">{t(`tiles.${tile.key}`)}</div>
                  <div className="text-[11px] text-white/85 leading-snug">{t(`tiles.${tile.key}Sub`)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {hasQuery && (
        <div className="space-y-5">
          {loading && total === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">{t('searching')}</div>
          )}
          {!loading && total === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">{t('nothing', { q })}</div>
          )}

          {results.communities.length > 0 && (
            <Group title={t('groups.communities')}>
              {results.communities.map((c) => (
                <Row key={c.slug} href={`/dashboard/community/c/${c.slug}`} Icon={Building2}
                  title={c.name}
                  subtitle={[c.city, c.denomination].filter(Boolean).join(' · ')} />
              ))}
            </Group>
          )}
          {results.people.length > 0 && (
            <Group title={t('groups.people')}>
              {results.people.map((p) => (
                <Row key={p.id} href={`/dashboard/people/${p.id}`} Icon={UserRound} title={p.name ?? '—'} />
              ))}
            </Group>
          )}
          {results.places.length > 0 && (
            <Group title={t('groups.places')}>
              {results.places.map((p) => (
                <Row key={p.id} href={`/dashboard/community/places/${p.id}`} Icon={MapPin} title={p.name}
                  subtitle={[PLACE_TYPE_LABELS[p.type]?.[locale], p.address].filter(Boolean).join(' · ')} />
              ))}
            </Group>
          )}
          {results.programs.length > 0 && (
            <Group title={t('groups.programs')}>
              {results.programs.map((p) => (
                <Row key={p.id} href={`/dashboard/community/programs/${p.id}`} Icon={BookOpenText} title={p.name} subtitle={p.schedule_text ?? undefined} />
              ))}
            </Group>
          )}
          {results.events.length > 0 && (
            <Group title={t('groups.events')}>
              {results.events.map((e) => (
                <Row key={e.id} href={`/dashboard/events/${e.id}`} Icon={CalendarDays}
                  title={e.title}
                  subtitle={[new Date(e.starts_at).toLocaleDateString(LOCALE_BCP47[locale], { day: 'numeric', month: 'short' }), e.location_text].filter(Boolean).join(' · ')} />
              ))}
            </Group>
          )}
          {results.interest_groups.length > 0 && (
            <Group title={t('groups.interestGroups')}>
              {results.interest_groups.map((g) => (
                <Row key={g.id} href={`/dashboard/connect/${g.id}`} Icon={MessageCircle} title={g.name} />
              ))}
            </Group>
          )}
          {results.requests.length > 0 && (
            <Group title={t('groups.requests')}>
              {results.requests.map((r) => (
                <Row key={r.id} href={`/dashboard/requests/${r.id}`} Icon={HandHeart} title={r.title} />
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-2 px-0.5">{title}</div>
      <div className="rounded-2xl bg-card ring-1 ring-border/70 divide-y divide-border/60 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({ href, Icon, title, subtitle }: { href: string; Icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground/70 shrink-0">
        <Icon size={16} strokeWidth={1.9} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-tight truncate">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</div>}
      </div>
      <ChevronRight size={15} className="text-muted-foreground/50 shrink-0 rtl:-scale-x-100" />
    </Link>
  );
}
