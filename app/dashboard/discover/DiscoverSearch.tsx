'use client';

// Full-screen-ish global search. Debounced fetch to /api/search, grouped
// results with lucide icons. Empty state shows category shortcuts.

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Search, X, Building2, BookOpen, CalendarDays, Users2, HandHeart,
  UserRound, ChevronRight, MapPin,
} from 'lucide-react';

interface Results {
  communities: Array<{ slug: string; name: string; city: string | null; country_code: string | null; denomination: string | null; member_count_cached: number }>;
  programs: Array<{ id: string; name: string; schedule_text: string | null }>;
  events: Array<{ id: string; title: string; starts_at: string; location_text: string | null }>;
  interest_groups: Array<{ id: string; name: string; member_count_cached: number }>;
  requests: Array<{ id: string; title: string; category: string }>;
  people: Array<{ id: string; name: string | null; image_url: string | null }>;
}

const EMPTY: Results = { communities: [], programs: [], events: [], interest_groups: [], requests: [], people: [] };

const SHORTCUTS = [
  { href: '/dashboard/community/discover', Icon: Building2, label: 'Общины мира' },
  { href: '/dashboard/connect', Icon: Users2, label: 'Группы по интересам' },
  { href: '/dashboard/events', Icon: CalendarDays, label: 'События' },
  { href: '/dashboard/requests', Icon: HandHeart, label: 'Просьбы' },
  { href: '/dashboard/people', Icon: UserRound, label: 'Участники' },
];

export function DiscoverSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setResults(EMPTY); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const data = await r.json();
        setResults({ ...EMPTY, ...data });
      } catch { /* ignore */ } finally { setLoading(false); }
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  const total =
    results.communities.length + results.programs.length + results.events.length +
    results.interest_groups.length + results.requests.length + results.people.length;
  const hasQuery = q.trim().length >= 2;

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-8">
      {/* Search input */}
      <div className="relative mb-5">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Общины, программы, события, люди…"
          className="w-full h-12 pl-11 pr-10 rounded-2xl bg-card ring-1 ring-border text-base outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Очистить"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* No query → shortcuts */}
      {!hasQuery && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-2 px-0.5">
            Разделы
          </div>
          <div className="rounded-2xl bg-card ring-1 ring-border/70 divide-y divide-border/60 overflow-hidden">
            {SHORTCUTS.map((s) => (
              <Link key={s.href} href={s.href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground/70">
                  <s.Icon size={16} strokeWidth={1.9} />
                </div>
                <span className="flex-1 text-sm font-medium">{s.label}</span>
                <ChevronRight size={15} className="text-muted-foreground/50" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {hasQuery && (
        <div className="space-y-5">
          {loading && total === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">Ищу…</div>
          )}
          {!loading && total === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Ничего не найдено по «{q}»
            </div>
          )}

          {results.communities.length > 0 && (
            <Group title="Общины">
              {results.communities.map((c) => (
                <Row key={c.slug} href={`/dashboard/community/c/${c.slug}`} Icon={Building2}
                  title={c.name}
                  subtitle={[c.city, c.denomination, `${c.member_count_cached} участников`].filter(Boolean).join(' · ')} />
              ))}
            </Group>
          )}
          {results.people.length > 0 && (
            <Group title="Люди">
              {results.people.map((p) => (
                <Row key={p.id} href={`/dashboard/people/${p.id}`} Icon={UserRound} title={p.name ?? 'Без имени'} />
              ))}
            </Group>
          )}
          {results.programs.length > 0 && (
            <Group title="Программы">
              {results.programs.map((p) => (
                <Row key={p.id} href={`/dashboard/community/programs/${p.id}`} Icon={BookOpen} title={p.name} subtitle={p.schedule_text ?? undefined} />
              ))}
            </Group>
          )}
          {results.events.length > 0 && (
            <Group title="События">
              {results.events.map((e) => (
                <Row key={e.id} href={`/dashboard/events/${e.id}`} Icon={CalendarDays}
                  title={e.title}
                  subtitle={[new Date(e.starts_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), e.location_text].filter(Boolean).join(' · ')} />
              ))}
            </Group>
          )}
          {results.interest_groups.length > 0 && (
            <Group title="Группы">
              {results.interest_groups.map((g) => (
                <Row key={g.id} href={`/dashboard/connect/${g.id}`} Icon={Users2} title={g.name} subtitle={`${g.member_count_cached} участников`} />
              ))}
            </Group>
          )}
          {results.requests.length > 0 && (
            <Group title="Просьбы">
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

function Row({ href, Icon, title, subtitle }: { href: string; Icon: typeof Building2; title: string; subtitle?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground/70 shrink-0">
        <Icon size={16} strokeWidth={1.9} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-tight truncate">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</div>}
      </div>
      <ChevronRight size={15} className="text-muted-foreground/50 shrink-0" />
    </Link>
  );
}
