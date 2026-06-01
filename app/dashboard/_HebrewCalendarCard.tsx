// Server-rendered Shabbat + upcoming holidays widget.
// Picks location: user's detected timezone (cookie) → community → null.

import { cookies } from 'next/headers';
import { getTranslations, getLocale } from 'next-intl/server';
import { upcomingShabbat, upcomingHolidays, todayInfo, type ShabbatInfo, type HolidayLine } from '@/lib/hebcal';
import { resolveLocation } from '@/lib/hebcal/timezone';
import { COOKIE_NAME as TZ_COOKIE } from '@/app/api/me/timezone/route';
import { UserLocationDetector } from './_UserLocationDetector';
import { LOCALE_BCP47, type Locale } from '@/i18n/config';

type Translator = (key: string, values?: Record<string, string | number>) => string;

interface Props {
  community: { city: string | null; country_code: string | null; timezone: string };
}

function tzTime(d: Date, tz: string, bcp47: string): string {
  return d.toLocaleTimeString(bcp47, { timeZone: tz, hour: '2-digit', minute: '2-digit' });
}
function tzDate(d: Date, tz: string, bcp47: string): string {
  return d.toLocaleDateString(bcp47, {
    timeZone: tz, weekday: 'short', day: '2-digit', month: 'short',
  });
}

export async function HebrewCalendarCard({ community }: Props) {
  const t = await getTranslations('personal');
  const locale = (await getLocale()) as Locale;
  const bcp47 = LOCALE_BCP47[locale];
  const cookieStore = await cookies();
  const userTz = cookieStore.get(TZ_COOKIE)?.value ?? null;
  const resolved = resolveLocation(userTz, community);

  if (!resolved) {
    return (
      <>
        <UserLocationDetector currentTz={userTz} />
        <div className="border rounded-xl p-5 text-sm text-(--color-fg-muted)">
          {t('calendar.noLocation')}
        </div>
      </>
    );
  }

  const { location: loc, name: locName, source } = resolved;
  const today = todayInfo(loc);
  const shabbat = upcomingShabbat(loc);
  const holidays = upcomingHolidays(loc, 60).slice(0, 5);

  return (
    <div className="space-y-4">
      <UserLocationDetector currentTz={userTz} />

      {/* Today */}
      <div className="border rounded-xl p-5 bg-gradient-to-br from-(--color-gold-soft) to-white">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-(--color-fg-muted)">{t('calendar.today')}</span>
          <span
            className="text-xs text-(--color-fg-muted)"
            title={source === 'user' ? t('calendar.yourZoneTitle') : t('calendar.communityZoneTitle')}
          >
            {locName} {source === 'user' ? t('calendar.yourZone') : t('calendar.communityZone')}
          </span>
        </div>
        <div className="font-serif text-xl font-semibold">{today.hebrewDate}</div>
        <div className="text-sm text-(--color-fg-muted) mt-0.5">{today.hebrewDateHe}</div>
        {today.todaysEvents.length > 0 && (
          <div className="text-sm mt-2">
            {today.todaysEvents.map((e, i) => <div key={i}>· {e}</div>)}
          </div>
        )}
      </div>

      {/* Shabbat */}
      {shabbat && <ShabbatBlock shabbat={shabbat} tz={loc.getTzid()} t={t} bcp47={bcp47} />}

      {/* Upcoming holidays */}
      {holidays.length > 0 && (
        <div className="border rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-wide text-(--color-fg-muted) mb-3">
            {t('calendar.upcomingHolidays')}
          </h3>
          <ul className="space-y-2">
            {holidays.map((h, i) => <HolidayRow key={i} h={h} tz={loc.getTzid()} bcp47={bcp47} />)}
          </ul>
        </div>
      )}
    </div>
  );
}

function ShabbatBlock({ shabbat, tz, t, bcp47 }: { shabbat: ShabbatInfo; tz: string; t: Translator; bcp47: string }) {
  return (
    <div className="border rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-(--color-fg-muted)">{t('calendar.shabbat')}</span>
        <span className="text-xs text-(--color-fg-muted)">{tzDate(shabbat.shabbatGregorianDate, tz, bcp47)}</span>
      </div>
      {shabbat.parshaRu && (
        <div className="mb-2">
          <div className="font-serif text-lg font-semibold">{t('calendar.parashat', { name: shabbat.parshaRu })}</div>
          {shabbat.parsha && shabbat.parsha !== shabbat.parshaRu && (
            <div className="text-xs text-(--color-fg-muted)">Parashat {shabbat.parsha}</div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {shabbat.candleLighting && (
          <div>
            <div className="text-xs text-(--color-fg-muted)">{t('calendar.candleLighting')}</div>
            <div className="font-medium">{tzTime(shabbat.candleLighting, tz, bcp47)}</div>
          </div>
        )}
        {shabbat.havdalah && (
          <div>
            <div className="text-xs text-(--color-fg-muted)">{t('calendar.havdalah')}</div>
            <div className="font-medium">{tzTime(shabbat.havdalah, tz, bcp47)}</div>
          </div>
        )}
      </div>
      <div className="text-xs text-(--color-fg-muted) mt-3">{shabbat.hebrewDateRu}</div>
    </div>
  );
}

function HolidayRow({ h, tz, bcp47 }: { h: HolidayLine; tz: string; bcp47: string }) {
  const showEn = h.title !== h.titleEn;
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className="text-lg leading-none mt-0.5">{h.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className={h.isMajor ? 'font-medium' : ''}>
          {h.title}
          {showEn && <span className="text-(--color-fg-muted) text-xs ml-2">· {h.titleEn}</span>}
        </div>
        <div className="text-xs text-(--color-fg-muted)">
          {tzDate(h.date, tz, bcp47)} · {h.hebrewDateRu}
        </div>
      </div>
    </li>
  );
}
