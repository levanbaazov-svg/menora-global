import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasuraAdmin } from '@/lib/hasura';
import { getOnboardingInfo } from '@/lib/onboarding/server';
import { AppHeader } from '@/app/_components/layout/AppHeader';
import { BottomNav } from '@/app/_components/layout/BottomNav';
import type { UserDisplay } from '@/lib/profile/display';

const HEADER_DATA = /* GraphQL */ `
  query HeaderData($user_id: uuid!) {
    users_by_pk(id: $user_id) {
      id email name image_url
    }
    memberships(
      where: { user_id: { _eq: $user_id }, status: { _eq: active } }
      limit: 1
    ) {
      community { id name }
    }
  }
`;

async function signOutAction() {
  'use server';
  await signOut({ redirectTo: '/' });
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/');

  // DB-fresh check — bounces user mid-onboarding back to the wizard.
  const info = await getOnboardingInfo(session.user.id);
  if (!info.done) redirect(info.redirectTarget);

  const data = await hasuraAdmin.request<{
    users_by_pk: UserDisplay | null;
    memberships: Array<{ community: { id: string; name: string } }>;
  }>(HEADER_DATA, { user_id: session.user.id });

  const user = data.users_by_pk ?? { id: session.user.id, email: session.user.email, name: session.user.name };
  const communityName = data.memberships[0]?.community?.name;
  const role = session.hasura.default_role;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        user={user}
        role={role}
        communityName={communityName}
        signOutAction={signOutAction}
      />
      <main className="flex-1 pb-20 md:pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
