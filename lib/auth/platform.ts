import 'server-only';
import { cache } from 'react';
import { hasuraAdmin } from '@/lib/hasura';

const Q = /* GraphQL */ `
  query IsPlatformAdmin($id: uuid!) {
    users_by_pk(id: $id) { is_platform_admin }
  }
`;

/**
 * Whether the user is a Menorah platform super-admin (the team running the
 * platform) — distinct from a community-scoped rabbi/admin. Platform admins can
 * create communities directly, moderate pending ones, and administer any
 * community on request. Memoized per request via React cache.
 */
export const isPlatformAdmin = cache(async (userId: string | null | undefined): Promise<boolean> => {
  if (!userId) return false;
  try {
    const r = await hasuraAdmin.request<{ users_by_pk: { is_platform_admin: boolean } | null }>(Q, { id: userId });
    return Boolean(r.users_by_pk?.is_platform_admin);
  } catch {
    return false;
  }
});
