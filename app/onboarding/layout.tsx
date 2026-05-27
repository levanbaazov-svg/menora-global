// Onboarding routes: require auth, bounce to /dashboard if already done.
// DB-fresh check — JWT may be stale right after finalize().

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getOnboardingInfo } from '@/lib/onboarding/server';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const info = await getOnboardingInfo(session.user.id);
  if (info.done) redirect('/dashboard');

  return <>{children}</>;
}
