// Wrapper around @hebcal/core. Server-only — the library is sizeable and
// not worth shipping to clients.
//
// Provides:
//   - hebrewDate(date, locale): "10 Sivan 5786" / "10 сиван 5786" / "י׳ סִיוָן תשפ״ו"
//   - upcomingShabbat(location): { candles, havdalah, parsha }
//   - upcomingEvents(location, days): holidays + parshiyot
//   - communityLocation(community): Location instance from community.city/country

import 'server-only';
import { HDate, HebrewCalendar, Location, type Event } from '@hebcal/core';
import { translateParsha, translateHoliday } from './translations';

// ── Russian transliteration of Hebrew months ────────────────────────────────
const HEBREW_MONTHS_RU: Record<string, string> = {
  Nisan: 'нисана', Iyyar: 'ияра', Iyar: 'ияра', Sivan: 'сивана',
  Tamuz: 'таммуза', Av: 'ава', Elul: 'элула',
  Tishrei: 'тишрея', Tishri: 'тишрея',
  Cheshvan: 'хешвана', Marcheshvan: 'хешвана',
  Kislev: 'кислева', Tevet: 'тевета',
  "Sh'vat": 'швата', Shvat: 'швата', Shevat: 'швата',
  Adar: 'адара', "Adar I": 'адара I', "Adar II": 'адара II', "Adar 1": 'адара I', "Adar 2": 'адара II',
};

// ── Hebrew date renderers ───────────────────────────────────────────────────
export type DateLocale = 'he' | 'en' | 'ru';

/**
 * Returns Hebrew date as a string in the requested locale.
 *   - 'he'  : native Hebrew with gematriya, e.g. "י׳ סִיוָן תשפ״ו"
 *   - 'en'  : English transliteration, "10 Sivan 5786"
 *   - 'ru'  : Russian transliteration, "10 сивана 5786"
 */
export function hebrewDate(date: Date | HDate, locale: DateLocale = 'ru'): string {
  const hd = date instanceof HDate ? date : new HDate(date);
  if (locale === 'he') return hd.renderGematriya();
  if (locale === 'en') return hd.render('en');
  // ru: hebcal gives "10 Sivan 5786" — translate the month
  const en = hd.render('en');  // "10 Sivan 5786"
  const m = en.match(/^(\d+)\s+(.+?)\s+(\d+)$/);
  if (!m) return en;
  const [, day, monthEn, year] = m;
  const monthRu = HEBREW_MONTHS_RU[monthEn] ?? monthEn.toLowerCase();
  return `${day} ${monthRu} ${year}`;
}

/** Short form: "10 сив" */
export function hebrewDateShort(date: Date | HDate, locale: DateLocale = 'ru'): string {
  const full = hebrewDate(date, locale);
  if (locale === 'ru') {
    return full.replace(/(\S+)а?\s+\d+$/, (_m, mon) => mon.slice(0, 3));
  }
  return full;
}

// ── Location lookup ─────────────────────────────────────────────────────────
export interface CommunityForLocation {
  city: string | null;
  country_code: string | null;
  timezone: string;
}

/**
 * Best-effort Location for a community. Falls back to country defaults
 * when city isn't in hebcal's database (~750 cities).
 */
export function communityLocation(community: CommunityForLocation): Location | null {
  if (community.city) {
    const found = Location.lookup(community.city);
    if (found) return found;
  }
  // Country fallback: pick a default city per country code.
  const fallback = COUNTRY_DEFAULT_CITY[community.country_code ?? ''];
  if (fallback) {
    const found = Location.lookup(fallback);
    if (found) return found;
  }
  // explicit no-match: continue to timezone fallback below
  // Last resort: anything that matches timezone roughly.
  if (community.timezone === 'Asia/Jerusalem') return Location.lookup('Jerusalem') ?? null;
  if (community.timezone === 'America/New_York') return Location.lookup('New York') ?? null;
  if (community.timezone === 'America/Los_Angeles') return Location.lookup('Los Angeles') ?? null;
  return null;
}

const COUNTRY_DEFAULT_CITY: Record<string, string> = {
  IL: 'Jerusalem',
  US: 'New York',
  CA: 'Toronto',
  GB: 'London',
  FR: 'Paris',
  DE: 'Berlin',
  RU: 'Moscow',
  AU: 'Sydney',
  AR: 'Buenos Aires',
};

// ── Upcoming Shabbat / holidays ─────────────────────────────────────────────
export interface ShabbatInfo {
  candleLighting: Date | null;
  havdalah: Date | null;
  parsha: string | null;
  parshaRu: string | null;
  hebrewDate: string;
  hebrewDateRu: string;
  shabbatGregorianDate: Date;
}

/** Returns info about the upcoming Shabbat (from now until next Saturday night). */
export function upcomingShabbat(location: Location): ShabbatInfo | null {
  const now = new Date();
  const end = new Date(now.getTime() + 8 * 86400_000);

  const events = HebrewCalendar.calendar({
    start: now, end,
    candlelighting: true,
    location,
    sedrot: true,
  });

  // Find the next Friday's candle lighting + Saturday's parsha + havdalah.
  const candles = events.find((e) => e.getCategories().includes('candles'));
  const parshaEv = events.find((e) => e.getCategories().includes('parashat'));
  const havdalahEv = events.find((e) => e.getCategories().includes('havdalah'));

  if (!candles && !parshaEv) return null;

  const shabbatDate = parshaEv ? parshaEv.getDate().greg() : candles!.getDate().greg();
  const parshaEn = parshaEv ? parshaEv.render('en').replace(/^Parashat\s+/, '') : null;
  const parshaRu = parshaEv ? translateParsha(parshaEv.render('en')) : null;

  return {
    candleLighting: candles ? eventTime(candles) : null,
    havdalah: havdalahEv ? eventTime(havdalahEv) : null,
    parsha: parshaEn,
    parshaRu,
    hebrewDate: hebrewDate(shabbatDate, 'en'),
    hebrewDateRu: hebrewDate(shabbatDate, 'ru'),
    shabbatGregorianDate: shabbatDate,
  };
}

function eventTime(ev: Event): Date | null {
  // Time-based events (candles, havdalah) carry eventTime via TimedEvent
  const t = (ev as unknown as { eventTime?: Date }).eventTime;
  return t instanceof Date ? t : null;
}

// ── Upcoming holidays (without weekly Shabbat noise) ────────────────────────
export interface HolidayLine {
  date: Date;
  hebrewDate: string;
  hebrewDateRu: string;
  title: string;        // Russian (or original if no translation)
  titleEn: string;      // Always English
  emoji: string;
  isMajor: boolean;
}

const HOLIDAY_EMOJI: Record<string, string> = {
  'Rosh Hashana': '🍯',
  'Yom Kippur': '🕊',
  'Sukkot': '🌿',
  'Sh’mini Atzeret': '🕎',
  'Simchat Torah': '🕎',
  'Chanukah': '🕎',
  'Tu BiShvat': '🌳',
  'Purim': '🎭',
  'Pesach': '🫓',
  'Yom HaShoah': '🕯',
  'Yom HaZikaron': '🕯',
  'Yom HaAtzma’ut': '🇮🇱',
  'Lag BaOmer': '🔥',
  'Yom Yerushalayim': '🕊',
  'Shavuot': '📖',
  'Tisha B’Av': '😢',
};

function emojiFor(title: string): string {
  for (const key of Object.keys(HOLIDAY_EMOJI)) {
    if (title.includes(key)) return HOLIDAY_EMOJI[key];
  }
  return '✡';
}

/** Returns upcoming holidays / fast days (excludes Shabbat parshiyot). */
export function upcomingHolidays(location: Location, days = 60): HolidayLine[] {
  const events = HebrewCalendar.calendar({
    start: new Date(),
    end: new Date(Date.now() + days * 86400_000),
    location,
    sedrot: false,
    candlelighting: false,
    omer: false,
    noMinorFast: false,
    noRoshChodesh: true,
    noSpecialShabbat: true,
  });

  return events
    .filter((e) => {
      const cats = e.getCategories();
      return cats.includes('major') || cats.includes('minor') ||
             cats.includes('fast') || cats.includes('modern');
    })
    .map((e) => {
      const greg = e.getDate().greg();
      const titleEn = e.render('en');
      const titleRu = translateHoliday(titleEn);
      return {
        date: greg,
        hebrewDate: hebrewDate(greg, 'en'),
        hebrewDateRu: hebrewDate(greg, 'ru'),
        title: titleRu,
        titleEn,
        emoji: emojiFor(titleEn),
        isMajor: e.getCategories().includes('major'),
      };
    });
}

// ── Today snapshot for dashboard ────────────────────────────────────────────
export interface TodayInfo {
  hebrewDate: string;
  hebrewDateHe: string;
  isShabbat: boolean;
  isYomTov: boolean;
  todaysEvents: string[];  // Parsha name on Saturday, holiday name, etc.
}

export function todayInfo(location: Location): TodayInfo {
  const today = new Date();
  const hd = new HDate(today);
  const events = HebrewCalendar.calendar({
    start: today, end: today,
    location, sedrot: true, candlelighting: false,
  });

  return {
    hebrewDate: hebrewDate(today, 'ru'),
    hebrewDateHe: hebrewDate(today, 'he'),
    isShabbat: hd.getDay() === 6,
    isYomTov: events.some((e) => e.getCategories().includes('major')),
    todaysEvents: events.map((e) => e.render('en')),
  };
}
