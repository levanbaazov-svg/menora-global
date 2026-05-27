import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { StepShell } from '../_StepShell';
import { PrivacyForm } from './PrivacyForm';

const FETCH = /* GraphQL */ `
  query FetchPrivacy($user_id: uuid!) {
    user_profiles_by_pk(user_id: $user_id) {
      profile_visibility notification_prefs
    }
  }
`;

interface NotifPrefs { channels?: string[]; categories?: string[]; }

export default async function PrivacyStep() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const data = await hasuraAdmin.request<{
    user_profiles_by_pk: { profile_visibility: string | null; notification_prefs: NotifPrefs | null } | null;
  }>(FETCH, { user_id: session.user.id });
  const p = data.user_profiles_by_pk;
  const ch = new Set(p?.notification_prefs?.channels ?? ['email', 'push']);
  const cat = new Set(p?.notification_prefs?.categories ?? ['events', 'requests', 'prayers', 'community_news']);

  return (
    <StepShell step="privacy" hasMembership={session.hasMembership}>
      <PrivacyForm defaults={{
        profile_visibility: p?.profile_visibility ?? 'community',
        channels: { email: ch.has('email'), push: ch.has('push') },
        categories: {
          events: cat.has('events'), requests: cat.has('requests'),
          prayers: cat.has('prayers'), community: cat.has('community_news'),
        },
      }} />
    </StepShell>
  );
}
