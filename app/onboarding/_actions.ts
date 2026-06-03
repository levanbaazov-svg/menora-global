'use server';

// Server actions for each onboarding step.
// All actions take (prevState, formData) and return ActionState — never throw
// on validation. On success they redirect (which throws NEXT_REDIRECT;
// useActionState on the client ignores it correctly).

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import {
  identitySchema, familySchema, religiousSchema, interestsSchema,
  communityChoiceSchema, privacySchema,
} from '@/lib/onboarding/schema';
import { nextStep, type OnboardingState } from '@/lib/onboarding/steps';
import { newJoinMembership } from '@/lib/demo';
import { type ActionState, formValues, zodErrorsToMap } from '@/lib/onboarding/action-state';

const UPSERT_PROFILE = /* GraphQL */ `
  mutation UpsertProfile($user_id: uuid!, $patch: user_profiles_set_input!) {
    insert_user_profiles_one(
      object: { user_id: $user_id }
      on_conflict: { constraint: user_profiles_pkey, update_columns: [] }
    ) { user_id }
    update_user_profiles_by_pk(pk_columns: { user_id: $user_id }, _set: $patch) {
      user_id
    }
  }
`;

// These mutations are guarded by where-clause: if the user has already
// completed onboarding (onboarding_step='done'), the update is a no-op.
// This makes the same forms safe to reuse from /dashboard/me/edit.
const ADVANCE_STEP = /* GraphQL */ `
  mutation AdvanceStep($user_id: uuid!, $step: onboarding_step!) {
    update_users(
      where: { id: { _eq: $user_id }, onboarding_step: { _neq: done } }
      _set: { onboarding_step: $step }
    ) { affected_rows }
  }
`;

const FINALIZE = /* GraphQL */ `
  mutation FinalizeOnboarding($user_id: uuid!) {
    update_users(
      where: { id: { _eq: $user_id }, onboarding_step: { _neq: done } }
      _set: { onboarding_step: done, onboarded_at: "now()", tutorial_completed: true }
    ) { affected_rows }
  }
`;

// status/role are enums — inline them (from the demo switch) rather than vars.
const submitJoinRequestMutation = (status: string, role: string) => /* GraphQL */ `
  mutation SubmitJoinRequest(
    $user_id: uuid!, $community_id: uuid!, $request_message: String!
  ) {
    insert_memberships_one(object: {
      user_id: $user_id, community_id: $community_id,
      entry_method: self_request, status: ${status},
      request_message: $request_message, role: ${role},
    }) { id }
  }
`;

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

function formObject(fd: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k in obj) {
      const existing = obj[k];
      obj[k] = Array.isArray(existing) ? [...existing, v] : [existing, v];
    } else {
      obj[k] = v;
    }
  }
  for (const k of ['interests', 'languages']) {
    const all = fd.getAll(k);
    if (all.length > 0) obj[k] = all;
  }
  return obj;
}

async function advance(userId: string, currentStep: Parameters<typeof nextStep>[0], hasMembership: boolean) {
  const next = nextStep(currentStep, hasMembership);
  if (next === 'done') {
    await hasuraAdmin.request(FINALIZE, { user_id: userId });
  } else {
    await hasuraAdmin.request(ADVANCE_STEP, { user_id: userId, step: next });
  }
  return next;
}

function targetUrl(next: OnboardingState): string {
  return next === 'done' ? '/dashboard' : `/onboarding/${next}`;
}

/**
 * Called from settings page (/dashboard/me/edit) — skip advance(), bounce back.
 * Returns true if form was edit-mode.
 */
function isEditMode(fd: FormData): boolean {
  return fd.get('from') === 'edit';
}

// ── Identity ───────────────────────────────────────────────────────────────
export async function submitIdentity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const raw = formObject(formData);
  const parsed = identitySchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }
  await hasuraAdmin.request(UPSERT_PROFILE, { user_id: userId, patch: parsed.data });
  if (isEditMode(formData)) redirect('/dashboard/me');
  const next = await advance(userId, 'identity', (await auth())?.hasMembership ?? false);
  redirect(targetUrl(next));
}

// ── Family ─────────────────────────────────────────────────────────────────
export async function submitFamily(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const raw = formObject(formData);
  const parsed = familySchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }
  const { children_ages_csv, ...rest } = parsed.data;
  const patch = { ...rest, children_ages: children_ages_csv };
  await hasuraAdmin.request(UPSERT_PROFILE, { user_id: userId, patch });
  if (isEditMode(formData)) redirect('/dashboard/me');
  const next = await advance(userId, 'family', (await auth())?.hasMembership ?? false);
  redirect(targetUrl(next));
}

// ── Religious ──────────────────────────────────────────────────────────────
export async function submitReligious(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const raw = formObject(formData);
  const parsed = religiousSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }
  await hasuraAdmin.request(UPSERT_PROFILE, { user_id: userId, patch: parsed.data });
  if (isEditMode(formData)) redirect('/dashboard/me');
  const next = await advance(userId, 'religious', (await auth())?.hasMembership ?? false);
  redirect(targetUrl(next));
}

// ── Interests ──────────────────────────────────────────────────────────────
export async function submitInterests(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const raw = formObject(formData);
  const parsed = interestsSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }
  await hasuraAdmin.request(UPSERT_PROFILE, { user_id: userId, patch: parsed.data });
  if (isEditMode(formData)) redirect('/dashboard/me');
  const next = await advance(userId, 'interests', (await auth())?.hasMembership ?? false);
  redirect(targetUrl(next));
}

// ── Community choice (self-signup) ─────────────────────────────────────────
export async function submitCommunityChoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const raw = formObject(formData);
  const parsed = communityChoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }
  const { status, role } = newJoinMembership();
  await hasuraAdmin.request(submitJoinRequestMutation(status, role), {
    user_id: userId,
    community_id: parsed.data.community_id,
    request_message: parsed.data.request_message,
  });
  if (isEditMode(formData)) redirect('/dashboard/me');
  const next = await advance(userId, 'community_choice', false);
  redirect(targetUrl(next));
}

// ── Privacy ────────────────────────────────────────────────────────────────
export async function submitPrivacy(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const raw = formObject(formData);
  const parsed = privacySchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: zodErrorsToMap(parsed.error), values: formValues(formData) };
  }
  const d = parsed.data;
  const channels = [d.notify_email && 'email', d.notify_push && 'push'].filter(Boolean);
  const categories = [
    d.notify_events && 'events',
    d.notify_requests && 'requests',
    d.notify_prayers && 'prayers',
    d.notify_community && 'community_news',
  ].filter(Boolean);
  const patch = {
    profile_visibility: d.profile_visibility,
    notification_prefs: { channels, categories },
  };
  await hasuraAdmin.request(UPSERT_PROFILE, { user_id: userId, patch });
  if (isEditMode(formData)) redirect('/dashboard/me');
  const next = await advance(userId, 'privacy', (await auth())?.hasMembership ?? false);
  redirect(targetUrl(next));
}
