// /onboarding redirects to /onboarding/<current-step>.
// Layout above already verified user is authed + not done.

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getOnboardingInfo } from '@/lib/onboarding/server';

export default async function OnboardingIndex() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const info = await getOnboardingInfo(session.user.id);
  redirect(info.redirectTarget);
}
