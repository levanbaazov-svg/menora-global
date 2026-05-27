// Server-side helper: DB-fresh check of the user's onboarding state.
// Used by /dashboard and /onboarding layouts to make routing decisions
// without relying on (potentially stale) JWT-encoded state.

import 'server-only';
import { hasuraAdmin } from '@/lib/hasura';
import { firstStepFor, type OnboardingState } from './steps';

const FETCH_STATE = /* GraphQL */ `
  query FetchOnboardingState($user_id: uuid!) {
    users_by_pk(id: $user_id) { onboarding_step }
    pending: memberships_aggregate(
      where: { user_id: { _eq: $user_id }, status: { _eq: pending } }
    ) { aggregate { count } }
    active: memberships_aggregate(
      where: { user_id: { _eq: $user_id }, status: { _eq: active } }
    ) { aggregate { count } }
  }
`;

export interface OnboardingInfo {
  state: OnboardingState;
  done: boolean;
  hasActiveMembership: boolean;
  hasPendingMembership: boolean;
  /** URL to send the user to right now: /dashboard if done, /onboarding/<step> otherwise */
  redirectTarget: string;
}

export async function getOnboardingInfo(userId: string): Promise<OnboardingInfo> {
  const res = await hasuraAdmin.request<{
    users_by_pk: { onboarding_step: OnboardingState } | null;
    pending: { aggregate: { count: number } | null };
    active: { aggregate: { count: number } | null };
  }>(FETCH_STATE, { user_id: userId });

  const state = (res.users_by_pk?.onboarding_step ?? 'signup') as OnboardingState;
  const done = state === 'done';
  const hasActiveMembership = (res.active.aggregate?.count ?? 0) > 0;
  const hasPendingMembership = (res.pending.aggregate?.count ?? 0) > 0;

  return {
    state,
    done,
    hasActiveMembership,
    hasPendingMembership,
    redirectTarget: done ? '/dashboard' : `/onboarding/${firstStepFor(state)}`,
  };
}
