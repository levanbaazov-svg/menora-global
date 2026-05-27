import { auth, signIn } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  return (
    <main className="min-h-screen overflow-hidden relative flex flex-col">
      {/* Soft golden radial in background */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(212,162,60,0.18), transparent 60%),' +
            'radial-gradient(ellipse 60% 40% at 80% 80%, rgba(199,168,98,0.12), transparent 60%)',
        }}
      />

      {/* Hero — emotional value prop */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="hero-pulse w-full max-w-md text-center fade-up">
          <div className="text-sm uppercase tracking-[0.2em] text-(--color-fg-muted) mb-6">
            ✦  Menorah Global
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl font-semibold leading-[1.05] tracking-tight mb-6">
            Свой <em className="italic font-normal text-(--color-gold-dark)">еврейский дом</em><br />
            везде, где ты
          </h1>

          <p className="text-base text-(--color-fg-muted) leading-relaxed mb-10 max-w-sm mx-auto">
            Шаббат-ужины. Кошерные места. AI-раввин в кармане.
            Найди свою общину или открой новые — в любом городе мира.
          </p>

          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/dashboard' });
            }}
          >
            <button
              type="submit"
              className="
                inline-flex items-center gap-3 px-7 h-14 rounded-full
                bg-(--color-deep) text-white font-semibold
                hover:scale-[1.02] active:scale-[0.99]
                transition-transform shadow-[var(--shadow-lg)]
              "
            >
              <GoogleLogo />
              <span>Войти через Google</span>
            </button>
          </form>

          <p className="text-xs text-(--color-fg-subtle) mt-6">
            Setup занимает ~3 минуты. Бесплатно.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-(--color-fg-subtle)">
        <span>Платформа для еврейских общин по всему миру</span>
      </footer>
    </main>
  );
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
