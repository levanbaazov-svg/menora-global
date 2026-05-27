import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ROUTINE_META, DAYS_OF_WEEK, type RoutineType } from '@/lib/routines/schema';
import { hebrewDate } from '@/lib/hebcal';
import { CheckinButton } from './CheckinButton';
import { ToggleEnabledButton, DeleteRoutineButton } from './RoutineActions';

const LIST = /* GraphQL */ `
  query ListRoutines($user_id: uuid!, $since: date!) {
    routines(
      where: { user_id: { _eq: $user_id } }
      order_by: [{ enabled: desc }, { target_time: asc }]
    ) {
      id type custom_label target_time days_of_week enabled reminder_offset_minutes
      checkins(
        where: { gregorian_date: { _gte: $since } }
        order_by: { gregorian_date: desc }
      ) {
        gregorian_date hebrew_date_text
      }
    }
  }
`;

interface Routine {
  id: string;
  type: RoutineType;
  custom_label: string | null;
  target_time: string | null;          // 'HH:MM:SS'
  days_of_week: number[] | null;       // null = every day
  enabled: boolean;
  reminder_offset_minutes: number;
  checkins: Array<{ gregorian_date: string; hebrew_date_text: string | null }>;
}

function labelOf(r: Routine): string {
  if (r.type === 'custom') return r.custom_label ?? 'Своя рутина';
  return ROUTINE_META[r.type].label;
}

function emojiOf(r: Routine): string {
  return ROUTINE_META[r.type].emoji;
}

function hhmm(t: string | null): string {
  if (!t) return '—';
  const [h, m] = t.split(':');
  return `${h}:${m}`;
}

function daysLabel(dow: number[] | null): string {
  if (!dow || dow.length === 0 || dow.length === 7) return 'каждый день';
  const labels = dow.sort((a, b) => a - b).map((d) => DAYS_OF_WEEK[d].short);
  return labels.join(' · ');
}

function isDueToday(r: Routine, today: Date): boolean {
  if (!r.enabled) return false;
  if (!r.days_of_week || r.days_of_week.length === 0) return true;
  return r.days_of_week.includes(today.getDay());
}

/** Counts consecutive days with check-in ending today or yesterday. */
function calcStreak(checkins: Array<{ gregorian_date: string }>, today: Date): number {
  if (checkins.length === 0) return 0;
  const dateSet = new Set(checkins.map((c) => c.gregorian_date));
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today.getTime() - 86400_000);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let cursor: Date;
  if (dateSet.has(todayStr)) cursor = today;
  else if (dateSet.has(yesterdayStr)) cursor = yesterday;
  else return 0;

  let streak = 0;
  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400_000);
  }
  return streak;
}

export default async function RoutinesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const today = new Date();
  const since = new Date(today.getTime() - 90 * 86400_000).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const client = await hasuraAsCurrentUser({ role: 'member' });
  const { routines } = await client.request<{ routines: Routine[] }>(
    LIST, { user_id: session.user.id, since },
  );

  const dueToday = routines.filter((r) => isDueToday(r, today));
  const allActive = routines.filter((r) => r.enabled);
  const paused = routines.filter((r) => !r.enabled);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Рутины</h1>
          <p className="text-sm text-(--color-muted) mt-1">
            {hebrewDate(today, 'ru')} · {hebrewDate(today, 'he')}
          </p>
        </div>
        <Link
          href="/dashboard/routines/new"
          className="px-5 py-2.5 rounded-full bg-(--color-deep) text-white text-sm font-semibold hover:opacity-90"
        >
          + Добавить
        </Link>
      </div>

      {/* TODAY section */}
      {dueToday.length > 0 ? (
        <section className="mb-12">
          <h2 className="font-serif text-xl font-semibold mb-4">Сегодня</h2>
          <div className="space-y-3">
            {dueToday.map((r) => {
              const done = r.checkins.some((c) => c.gregorian_date === todayStr);
              const streak = calcStreak(r.checkins, today);
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-4 border rounded-xl p-4 ${done ? 'bg-(--color-gold-soft) border-(--color-gold)' : ''}`}
                >
                  <CheckinButton routineId={r.id} done={done} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{emojiOf(r)}</span>
                      <span className="font-semibold">{labelOf(r)}</span>
                      {r.target_time && (
                        <span className="text-sm text-(--color-muted)">в {hhmm(r.target_time)}</span>
                      )}
                    </div>
                    {streak > 0 && (
                      <div className="text-xs text-(--color-muted) mt-1">
                        🔥 Стрик: {streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : routines.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center mb-12">
          <p className="text-(--color-muted) mb-4">У тебя ещё нет рутин.</p>
          <Link
            href="/dashboard/routines/new"
            className="px-5 py-2.5 rounded-full bg-(--color-gold) text-(--color-deep) text-sm font-semibold hover:scale-105 inline-block transition-transform"
          >
            Добавить первую
          </Link>
        </div>
      ) : (
        <p className="text-sm text-(--color-muted) mb-12">Сегодня ничего не запланировано — отдыхаешь.</p>
      )}

      {/* MANAGEMENT section */}
      {allActive.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-base font-semibold mb-3 text-(--color-muted) uppercase tracking-wide">
            Все рутины
          </h2>
          <div className="border rounded-xl overflow-hidden divide-y">
            {allActive.map((r) => (
              <RoutineRow key={r.id} r={r} />
            ))}
          </div>
        </section>
      )}

      {paused.length > 0 && (
        <section>
          <h2 className="font-serif text-base font-semibold mb-3 text-(--color-muted) uppercase tracking-wide">
            На паузе
          </h2>
          <div className="border rounded-xl overflow-hidden divide-y opacity-60">
            {paused.map((r) => (
              <RoutineRow key={r.id} r={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RoutineRow({ r }: { r: Routine }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <span className="text-lg">{emojiOf(r)}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{labelOf(r)}</div>
        <div className="text-xs text-(--color-muted) mt-0.5">
          {hhmm(r.target_time)} · {daysLabel(r.days_of_week)}
        </div>
      </div>
      <div className="flex gap-2">
        <ToggleEnabledButton id={r.id} enabled={r.enabled} />
        <DeleteRoutineButton id={r.id} label={labelOf(r)} />
      </div>
    </div>
  );
}
