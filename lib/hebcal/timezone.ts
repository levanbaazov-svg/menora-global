// IANA timezone → city lookup. Covers major Jewish population centers.
// When a user's browser reports a tz, we look up a sensible default city
// for hebcal Location calculations (sun-based candle/havdalah times).
//
// Edge cases:
//   - Many cities share the same tz (Miami / NY / Boston all America/New_York).
//     We pick the largest by default; user can manually override later.

import 'server-only';
import { Location } from '@hebcal/core';
import { communityLocation } from './index';

const TZ_TO_CITY: Record<string, string> = {
  // Israel
  'Asia/Jerusalem': 'Jerusalem',
  'Asia/Tel_Aviv':  'Tel Aviv',

  // North America
  'America/New_York':     'New York',
  'America/Detroit':      'Detroit',
  'America/Chicago':      'Chicago',
  'America/Denver':       'Denver',
  'America/Los_Angeles':  'Los Angeles',
  'America/Phoenix':      'Phoenix',
  'America/Indiana/Indianapolis': 'Indianapolis',
  'America/Anchorage':    'Anchorage',
  'Pacific/Honolulu':     'Honolulu',
  'America/Toronto':      'Toronto',
  'America/Vancouver':    'Vancouver',
  'America/Montreal':     'Montreal',

  // Europe / FSU
  'Europe/London':        'London',
  'Europe/Paris':         'Paris',
  'Europe/Berlin':        'Berlin',
  'Europe/Amsterdam':     'Amsterdam',
  'Europe/Brussels':      'Brussels',
  'Europe/Vienna':        'Vienna',
  'Europe/Madrid':        'Madrid',
  'Europe/Rome':          'Rome',
  'Europe/Zurich':        'Zurich',
  'Europe/Moscow':        'Moscow',
  'Europe/Kyiv':          'Kyiv',
  'Europe/Kiev':          'Kyiv',
  'Europe/Riga':          'Riga',
  'Europe/Vilnius':       'Vilnius',
  'Europe/Warsaw':        'Warsaw',
  'Europe/Prague':        'Prague',
  'Europe/Budapest':      'Budapest',
  'Europe/Istanbul':      'Istanbul',

  // South America
  'America/Sao_Paulo':            'São Paulo',
  'America/Argentina/Buenos_Aires':'Buenos Aires',
  'America/Mexico_City':          'Mexico City',
  'America/Bogota':               'Bogota',
  'America/Santiago':             'Santiago',

  // Australia / NZ
  'Australia/Sydney':     'Sydney',
  'Australia/Melbourne':  'Melbourne',
  'Australia/Perth':      'Perth',
  'Pacific/Auckland':     'Auckland',

  // Africa
  'Africa/Johannesburg':  'Johannesburg',
};

export interface ResolvedLocation {
  location: Location;
  name: string;
  source: 'user' | 'community';
}

/**
 * Try to find a Location for an IANA timezone string. Returns null if no match.
 */
export function locationFromTimezone(tz: string | null): Location | null {
  if (!tz) return null;
  const city = TZ_TO_CITY[tz];
  if (!city) return null;
  return Location.lookup(city) ?? null;
}

/**
 * Pick the best location: user's detected tz if recognized, otherwise community.
 */
export function resolveLocation(
  userTz: string | null,
  community: { city: string | null; country_code: string | null; timezone: string },
): ResolvedLocation | null {
  const userLoc = locationFromTimezone(userTz);
  if (userLoc) {
    return { location: userLoc, name: userLoc.getName() ?? 'Local', source: 'user' };
  }
  const commLoc = communityLocation(community);
  if (commLoc) {
    return { location: commLoc, name: commLoc.getName() ?? community.city ?? 'Community', source: 'community' };
  }
  return null;
}
