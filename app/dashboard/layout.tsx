import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getOnboardingInfo } from '@/lib/onboarding/server';
import { MobileNav } from './_MobileNav';
import { NotificationBell } from './_NotificationBell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/');

  // DB-fresh check — bounces user mid-onboarding back to the wizard,
  // never trusting the (potentially stale) JWT-encoded onboarding_step.
  const info = await getOnboardingInfo(session.user.id);
  if (!info.done) redirect(info.redirectTarget);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <a href="/dashboard" className="font-serif text-lg md:text-xl font-semibold">Menorah Global</a>
          <div className="flex items-center gap-2 md:gap-4">
            <NotificationBell />
            <span className="hidden sm:inline text-sm text-(--color-muted)">{session.user.email}</span>
            <form action={async () => { 'use server'; await signOut({ redirectTo: '/' }); }}>
              <button
                type="submit"
                className="text-sm text-(--color-muted) hover:text-(--color-deep)"
              >
                Выйти
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
