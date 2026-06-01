// Compact routines card for the dashboard home (Lovable layout).
// Shows: today's streak + count "N of M today" + 3 next prayer pills with status.

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { hasuraAdmin } from '@/lib/hasura';
import { Flame, ChevronRight, Check } from 'lucide-react';

const FETCH = /* GraphQL */ `
  query HomeRoutines($user_id: uuid!, $since: date!) {
    routines(
      where: { user_id: { _eq: $user_id }, enabled: { _eq: true } }
      order_by: { target_time: asc }
    ) {
      id type custom_label target_time
      checkins(
        where: { user_id: { _eq: $user_id }, gregorian_date: { _gte: $since } }
        order_by: { gregorian_date: desc }
      ) { gregorian_date }
    }
  }
`;

interface RoutineRow {
  id: string;
  type: string;
  custom_label: string | null;
  target_time: string | null;
  checkins: Array<{ gregorian_date: string }>;
}

const KNOWN_TYPES = new Set([
  'shacharit', 'mincha', 'maariv', 'modeh_ani', 'shema',
  'bedtime_shema', 'birkat_hamazon', 'tehillim', 'custom',
]);

function isoDateLocal(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function calcStreak(allCheckinDates: Set<string>, today: Date): number {
  let streak = 0;
  const cursor = new Date(today);
  // Walk backwards starting from today (or yesterday if today has none)
  if (!allCheckinDates.has(isoDateLocal(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (allCheckinDates.has(isoDateLocal(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function RoutineHomeCard({ userId }: { userId: string }) {
  const today = new Date();
  const since = new Date(today.getTime() - 90 * 86_400_000);
  const t = await getTranslations('home.routine');

  const data = await hasuraAdmin.request<{ routines: RoutineRow[] }>(FETCH, {
    user_id: userId,
    since: isoDateLocal(since),
  });

  const allRoutines = data.routines;
  if (allRoutines.length === 0) {
    // No routines yet → invite to create
    return (
      <Link
        href="/dashboard/routines"
        className="
          group block rounded-2xl bg-card border border-border/60 p-4
          hover:border-primary/40 hover:shadow-[0_4px_14px_-2px_rgba(20,24,31,0.08)]
          transition-all
        "
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
            <Flame size={16} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-serif text-base font-semibold leading-tight">{t('title')}</div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {t('emptyHint')}
            </p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground/60 mt-1" />
        </div>
      </Link>
    );
  }

  const todayIso = isoDateLocal(today);
  const allDates = new Set<string>();
  for (const r of allRoutines) for (const c of r.checkins) allDates.add(c.gregorian_date);

  const streak = calcStreak(allDates, today);
  const doneToday = allRoutines.filter((r) => r.checkins.some((c) => c.gregorian_date === todayIso)).length;
  const totalToday = allRoutines.length;
  const next3 = allRoutines.slice(0, 3);

  return (
    <Link
      href="/dashboard/routines"
      className="
        group block rounded-2xl bg-card border border-border/60 overflow-hidden
        hover:border-primary/30 hover:shadow-[0_8px_24px_-4px_rgba(20,24,31,0.08)]
        transition-all
      "
    >
      {/* Header */}
      <div className="px-3.5 pt-3 pb-2 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
          <Flame size={15} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-[15px] font-semibold leading-tight">{t('title')}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {streak > 0 ? t('streak', { count: streak }) : t('startStreak')} · {t('todayCount', { done: doneToday, total: totalToday })}
          </div>
        </div>
        <ChevronRight size={15} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
      </div>

      {/* Routine pills row */}
      <div className="px-3.5 pb-3 pt-0.5 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {next3.map((r) => {
          const label = r.custom_label ?? (KNOWN_TYPES.has(r.type) ? t(`types.${r.type}`) : r.type);
          const done = r.checkins.some((c) => c.gregorian_date === todayIso);
          const time = r.target_time?.slice(0, 5) ?? '';
          return (
            <div
              key={r.id}
              className={`
                shrink-0 flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-1 text-[11px] font-medium
                transition-colors
                ${done
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-muted text-foreground/70'}
              `}
            >
              <span
                className={`
                  inline-flex w-4 h-4 rounded-full items-center justify-center
                  ${done ? 'bg-orange-500 text-white' : 'border border-foreground/20'}
                `}
              >
                {done && <Check size={10} strokeWidth={3} />}
              </span>
              {time && <span className="tabular-nums opacity-70">{time}</span>}
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    </Link>
  );
}
