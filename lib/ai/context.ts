// Builds the per-user context block fed into the AI system prompt.
// Currently: community + role + parsha + today's hebrew date.

import 'server-only';
import { hasuraAdmin } from '@/lib/hasura';
import {
  upcomingShabbat, todayInfo, communityLocation,
} from '@/lib/hebcal';
import { resolveLocation } from '@/lib/hebcal/timezone';

const FETCH = /* GraphQL */ `
  query AIContext($user_id: uuid!) {
    users_by_pk(id: $user_id) {
      id name
    }
    memberships(
      where: { user_id: { _eq: $user_id }, status: { _eq: active } }
      limit: 1
    ) {
      role
      community { id slug name city country_code timezone }
    }
  }
`;

export interface UserAIContext {
  userName: string | null;
  communityName: string | null;
  role: string | null;
  parsha: string | null;
  todayHebrew: string | null;
  timezone: string | null;
}

export async function buildUserContext(
  userId: string,
  userTzFromCookie?: string | null,
): Promise<UserAIContext> {
  const data = await hasuraAdmin.request<{
    users_by_pk: { id: string; name: string | null } | null;
    memberships: Array<{
      role: string;
      community: {
        id: string; slug: string; name: string;
        city: string | null; country_code: string | null; timezone: string;
      } | null;
    }>;
  }>(FETCH, { user_id: userId });

  const userName = data.users_by_pk?.name ?? null;
  const m = data.memberships[0] ?? null;
  const community = m?.community ?? null;
  const role = m?.role ?? null;

  // Compute parsha + today's hebrew date from the user's effective location.
  let parsha: string | null = null;
  let todayHebrew: string | null = null;
  let timezone: string | null = null;

  if (community) {
    const resolved = resolveLocation(userTzFromCookie ?? null, community);
    if (resolved) {
      timezone = resolved.location.getTzid();
      try {
        const shabbat = upcomingShabbat(resolved.location);
        parsha = shabbat?.parshaRu ?? shabbat?.parsha ?? null;
      } catch { /* skip on hebcal error */ }
      try {
        const today = todayInfo(resolved.location);
        todayHebrew = today.hebrewDate ?? null;
      } catch { /* skip */ }
    } else {
      // Fall back to community's static location only.
      const loc = communityLocation(community);
      if (loc) {
        timezone = loc.getTzid();
        try {
          const shabbat = upcomingShabbat(loc);
          parsha = shabbat?.parshaRu ?? shabbat?.parsha ?? null;
        } catch { /* skip */ }
        try {
          const today = todayInfo(loc);
          todayHebrew = today.hebrewDate ?? null;
        } catch { /* skip */ }
      }
    }
  }

  return {
    userName,
    communityName: community?.name ?? null,
    role,
    parsha,
    todayHebrew,
    timezone,
  };
}
