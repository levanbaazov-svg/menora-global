// Active-community cookie — lets a multi-community member switch which
// community is "active" without re-authenticating. The session callback in
// lib/auth.ts reads this and overrides communityId + defaultRole from the
// JWT's roleByCommunity map (only if the chosen id is in allowedCommunityIds).

export const ACTIVE_COMMUNITY_COOKIE = 'menorah-active-community';

// 1 year — it's just a preference, re-validated against memberships every request.
export const ACTIVE_COMMUNITY_MAX_AGE = 60 * 60 * 24 * 365;
