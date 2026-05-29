import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasuraAdmin } from '@/lib/hasura';
import { getOnboardingInfo } from '@/lib/onboarding/server';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppTopBar } from '@/components/layout/AppTopBar';
import { AppBottomNav } from '@/components/layout/AppBottomNav';
import { PageTransition } from '@/components/motion/PageTransition';
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

  const info = await getOnboardingInfo(session.user.id);
  if (!info.done) redirect(info.redirectTarget);

  const data = await hasuraAdmin.request<{
    users_by_pk: UserDisplay | null;
    memberships: Array<{ community: { id: string; name: string } }>;
  }>(HEADER_DATA, { user_id: session.user.id });

  const user = data.users_by_pk ?? {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
  const communityName = data.memberships[0]?.community?.name;
  const role = session.hasura.default_role as 'member' | 'rabbi' | 'admin';

  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        role={role}
        communityName={communityName}
        signOutAction={signOutAction}
      />
      <SidebarInset>
        <AppTopBar />
        <main className="flex-1 pb-24 md:pb-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </SidebarInset>
      <AppBottomNav />
    </SidebarProvider>
  );
}
