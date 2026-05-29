// Compact Shabbat-this-week hero for the dashboard home.
// Replaces the bulky calendar widget — focuses on the single most actionable
// fact: when's the next Shabbat + its parsha + candle/havdalah times.

import { cookies } from 'next/headers';
import Link from 'next/link';
import { upcomingShabbat } from '@/lib/hebcal';
import { resolveLocation } from '@/lib/hebcal/timezone';
import { COOKIE_NAME as TZ_COOKIE } from '@/app/api/me/timezone/route';
import { Flame, ChevronRight } from 'lucide-react';

interface Props {
  community: { id: string; name: string; city: string | null; country_code: string | null; timezone: string };
}

function tzTime(d: Date, tz: string): string {
  return d.toLocaleTimeString('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
}
function tzDate(d: Date, tz: string): string {
  return d.toLocaleDateString('ru-RU', {
    timeZone: tz, weekday: 'long', day: 'numeric', month: 'long',
  });
}

function daysUntil(target: Date): number {
  const now = new Date();
  const t = new Date(target);
  now.setHours(0,0,0,0);
  t.setHours(0,0,0,0);
  return Math.round((t.getTime() - now.getTime()) / 86_400_000);
}

export async function ShabbatHero({ community }: Props) {
  const cookieStore = await cookies();
  const userTz = cookieStore.get(TZ_COOKIE)?.value ?? null;
  const resolved = resolveLocation(userTz, community);
  if (!resolved) return null;

  const shabbat = upcomingShabbat(resolved.location);
  if (!shabbat) return null;

  const tz = resolved.location.getTzid();
  const candle = shabbat.candleLighting;
  const havdalah = shabbat.havdalah;
  const days = candle ? daysUntil(candle) : null;

  const countdownLabel =
    days === 0 ? 'сегодня'
    : days === 1 ? 'завтра'
    : days != null && days > 1 ? `через ${days} ${days < 5 ? 'дня' : 'дней'}`
    : null;

  return (
    <Link
      href="/dashboard/community"
      className="group block overflow-hidden rounded-2xl ring-1 ring-border/70 bg-card hover:bg-muted/30 transition-colors"
    >
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border/60">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Flame className="h-3.5 w-3.5" />
        </div>
        <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
          Шаббат · {countdownLabel ?? 'скоро'}
        </div>
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="p-4">
        <div className="font-serif text-xl md:text-2xl font-semibold leading-tight">
          {shabbat.parshaRu ?? shabbat.parsha ?? 'Шаббат'}
        </div>
        {candle && (
          <div className="text-xs text-muted-foreground mt-1 capitalize">
            {tzDate(candle, tz)}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-border/60">
          {candle && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-0.5">
                Зажигание свечей
              </div>
              <div className="text-base font-semibold tabular-nums">{tzTime(candle, tz)}</div>
            </div>
          )}
          {havdalah && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-0.5">
                Гавдала
              </div>
              <div className="text-base font-semibold tabular-nums">{tzTime(havdalah, tz)}</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
