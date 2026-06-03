import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasuraAdmin } from '@/lib/hasura';
import { getOnboardingInfo } from '@/lib/onboarding/server';
import { isPlatformAdmin } from '@/lib/auth/platform';
import { AppHeader } from '@/app/_components/layout/AppHeader';
import { BottomNav } from '@/app/_components/layout/BottomNav';
import { PageTransition } from '@/components/motion/PageTransition';
import type { UserDisplay } from '@/lib/profile/display';

const HEADER_DATA = /* GraphQL */ `
  query HeaderData($user_id: uuid!) {
    users_by_pk(id: $user_id) {
      id email name image_url
    }
    memberships(
      where: { user_id: { _eq: $user_id }, status: { _eq: active } }
      order_by: { joined_at: asc }
    ) {
      role
      community { id name city }
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

  // These two reads are independent — run them concurrently to avoid stacking
  // two ~700ms round-trips to Hasura Cloud on every navigation.
  const [info, data, platformAdmin] = await Promise.all([
    getOnboardingInfo(session.user.id),
    hasuraAdmin.request<{
      users_by_pk: UserDisplay | null;
      memberships: Array<{ community: { id: string; name: string } }>;
    }>(HEADER_DATA, { user_id: session.user.id }),
    isPlatformAdmin(session.user.id),
  ]);
  if (!info.done) redirect(info.redirectTarget);

  const user = data.users_by_pk ?? {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
  const communityName = data.memberships[0]?.community?.name;
  const role = session.hasura.default_role as 'member' | 'rabbi' | 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader
        user={user}
        role={role}
        communityName={communityName}
        platformAdmin={platformAdmin}
        signOutAction={signOutAction}
      />
      <main className="flex-1 flex flex-col pb-28 md:pb-12">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}
