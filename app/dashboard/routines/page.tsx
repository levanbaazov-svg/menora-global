// Routines + streaks. Stat header (current/longest/total) + today's checklist
// grouped by time-of-day, with optimistic check toggles.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';
import { Plus, Sunrise, Sun, Moon } from 'lucide-react';
import { CheckinToggle } from './CheckinToggle';
import { StreakHeader } from './StreakHeader';
import { Reveal } from '@/components/motion/Reveal';
import { type RoutineType } from '@/lib/routines/schema';
import { hebrewDate } from '@/lib/hebcal';
import { LOCALE_BCP47, type Locale } from '@/i18n/config';

const FETCH = /* GraphQL */ `
  query Routines($user_id: uuid!, $since: date!) {
    routines(
      where: { user_id: { _eq: $user_id } }
      order_by: [{ enabled: desc }, { target_time: asc }]
    ) {
      id type custom_label target_time days_of_week enabled
      checkins(where: { gregorian_date: { _gte: $since } }, order_by: { gregorian_date: desc }) {
        gregorian_date
      }
    }
  }
`;

interface Routine {
  id: string; type: RoutineType; custom_label: string | null;
  target_time: string | null; days_of_week: number[] | null; enabled: boolean;
  checkins: Array<{ gregorian_date: string }>;
}

function toISO(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function calcStreak(dateSet: Set<string>, today: Date): number {
  let streak = 0;
  const cursor = new Date(today);
  if (!dateSet.has(toISO(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dateSet.has(toISO(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function calcLongest(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = Array.from(new Set(dates)).sort();
  let longest = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    run = diff === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return longest;
}

function timeBucket(t: string | null): 'morning' | 'day' | 'evening' {
  if (!t) return 'day';
  const h = parseInt(t.slice(0, 2), 10);
  if (h < 11) return 'morning';
  if (h < 17) return 'day';
  return 'evening';
}

const BUCKETS = [
  { key: 'morning', Icon: Sunrise },
  { key: 'day',     Icon: Sun },
  { key: 'evening', Icon: Moon },
] as const;

export default async function RoutinesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const t = await getTranslations('personal');
  const locale = (await getLocale()) as Locale;

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const today = new Date();
  const since = new Date(today.getTime() - 365 * 86_400_000);
  const data = await client.request<{ routines: Routine[] }>(FETCH, {
    user_id: session.user.id, since: toISO(since),
  });

  const todayISO = toISO(today);
  const todayDow = today.getDay();
  const hebToday = hebrewDate(today, locale);

  // Aggregate stats across all routines
  const allDates: string[] = [];
  for (const r of data.routines) for (const c of r.checkins) allDates.push(c.gregorian_date);
  const allDateSet = new Set(allDates);
  const currentStreak = calcStreak(allDateSet, today);
  const longestStreak = calcLongest(allDates);
  const totalCheckins = allDates.length;

  const activeToday = data.routines.filter(
    (r) => r.enabled && (!r.days_of_week || r.days_of_week.length === 0 || r.days_of_week.includes(todayDow)),
  );
  const doneToday = activeToday.filter((r) => r.checkins.some((c) => c.gregorian_date === todayISO)).length;

  // group active-today by time bucket
  const byBucket = new Map<string, Routine[]>();
  for (const r of activeToday) {
    const b = timeBucket(r.target_time);
    const arr = byBucket.get(b) ?? [];
    arr.push(r);
    byBucket.set(b, arr);
  }

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-8">
      <header className="flex items-start justify-between gap-3 mb-4 px-0.5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
            {t('routines.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">
            {today.toLocaleDateString(LOCALE_BCP47[locale], { weekday: 'long', day: 'numeric', month: 'long' })}
            <span className="text-muted-foreground/70"> · {hebToday}</span>
          </p>
        </div>
        <Link
          href="/dashboard/routines/new"
          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold shadow-[var(--shadow-gold)] hover:opacity-95 active:scale-95 transition-all"
        >
          <Plus size={15} strokeWidth={2.4} /> {t('routines.addShort')}
        </Link>
      </header>

      {data.routines.length === 0 ? (
        <EmptyRoutines t={t} />
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <StreakHeader
            current={currentStreak}
            longest={longestStreak}
            totalCheckins={totalCheckins}
            doneToday={doneToday}
            totalToday={activeToday.length}
          />

          {/* Today's checklist grouped by bucket */}
          {BUCKETS.map((bucket) => {
            const items = byBucket.get(bucket.key) ?? [];
            if (items.length === 0) return null;
            return (
              <Reveal key={bucket.key} delay={0.05}>
                <section>
                  <h2 className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2 px-0.5">
                    <bucket.Icon size={13} strokeWidth={2} /> {t(`routines.buckets.${bucket.key}`)}
                  </h2>
                  <div className="rounded-2xl bg-card ring-1 ring-border/70 divide-y divide-border/60 overflow-hidden">
                    {items.map((r) => {
                      const checked = r.checkins.some((c) => c.gregorian_date === todayISO);
                      const rDates = new Set(r.checkins.map((c) => c.gregorian_date));
                      const rStreak = calcStreak(rDates, today);
                      return (
                        <div key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                          <CheckinToggle routineId={r.id} checked={checked} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium leading-tight">
                              {r.custom_label ?? t(`routines.types.${r.type}`)}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              {r.target_time?.slice(0, 5) ?? t('routines.anyTime')}
                              {rStreak > 0 && (
                                <span className="text-orange-600 font-medium">🔥 {rStreak}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </Reveal>
            );
          })}

          {/* Disabled / all routines manager link */}
          <Link
            href="/dashboard/routines/new"
            className="block rounded-2xl border border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            {t('routines.addMore')}
          </Link>
        </div>
      )}
    </div>
  );
}

function EmptyRoutines({ t }: { t: (key: string) => string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
      <div className="text-4xl mb-3">🔥</div>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
        {t('routines.emptyHint')}
      </p>
      <Link
        href="/dashboard/routines/new"
        className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold"
      >
        {t('routines.createFirst')}
      </Link>
    </div>
  );
}
