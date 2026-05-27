import { auth, signIn } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();

  // Signed-in users are routed by middleware (to /onboarding or /dashboard).
  // If we get here AND we're signed in, send straight to dashboard;
  // the middleware will rebound to /onboarding if not done.
  if (session?.user) redirect('/dashboard');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-10 p-8">
      <div className="text-center space-y-4 max-w-xl">
        <h1 className="font-serif text-5xl font-semibold">Menorah Global</h1>
        <p className="text-lg text-(--color-muted)">
          Платформа для еврейских общин по всему миру.
        </p>
      </div>

      <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/dashboard' }); }}>
        <button
          type="submit"
          className="px-8 py-3 rounded-full bg-(--color-gold) text-(--color-deep) font-semibold hover:scale-105 transition-transform"
        >
          Войти через Google
        </button>
      </form>
    </main>
  );
}
