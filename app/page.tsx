import { auth, signIn } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  const t = await getTranslations('aiPublic');

  return (
    <main className="min-h-screen overflow-hidden relative flex flex-col">
      {/* ── Background — soft golden radials ─────────────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 18%, rgba(201,155,67,0.20), transparent 60%),' +
            'radial-gradient(ellipse 60% 40% at 85% 85%, rgba(199,168,98,0.14), transparent 60%)',
        }}
      />

      {/* Subtle Hebrew star pattern — barely visible texture */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><polygon fill='%23000' points='40,4 47,28 73,28 51,44 60,68 40,52 20,68 29,44 7,28 33,28'/></svg>")`,
          backgroundSize: '160px 160px',
        }}
      />

      {/* ── Top brand mark ─────────────────────────────────────────────── */}
      <header className="px-6 pt-6 md:pt-8 flex items-center justify-between safe-top">
        <div className="flex items-center gap-2">
          <span className="text-(--color-gold) text-lg">✦</span>
          <span className="font-serif italic text-lg font-semibold tracking-tight">
            Menorah
          </span>
        </div>
        <a
          href="#features"
          className="text-xs text-(--color-fg-muted) hover:text-(--color-deep) transition-colors"
        >
          {t('landing.whatsInside')}
        </a>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-10 md:py-16">
        <div className="hero-pulse w-full max-w-xl text-center fade-up">
          <div className="text-[11px] uppercase tracking-[0.25em] text-(--color-gold-dark) mb-5 font-semibold">
            {t('landing.brandTag')}
          </div>

          <h1 className="font-serif text-[2.75rem] sm:text-5xl md:text-6xl font-semibold leading-[1.02] tracking-tight mb-5">
            {t('landing.heroTitlePre')}{' '}
            <em className="italic font-normal text-(--color-gold-dark) relative inline-block">
              {t('landing.heroTitleEm')}
            </em>
            <br />
            {t('landing.heroTitlePost')}
          </h1>

          <p className="text-base md:text-lg text-(--color-fg-muted) leading-relaxed mb-8 max-w-md mx-auto">
            {t('landing.heroSubtitle')}
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
                transition-all duration-200 shadow-[var(--shadow-lg)]
                hover:shadow-[var(--shadow-xl)]
                focus-visible:outline-(--color-gold)
              "
            >
              <GoogleLogo />
              <span>{t('landing.signInGoogle')}</span>
            </button>
          </form>

          <p className="text-xs text-(--color-fg-subtle) mt-5">
            {t('landing.signInNote')}
          </p>
        </div>
      </section>

      {/* ── 3 value props ──────────────────────────────────────────────── */}
      <section id="features" className="px-6 pb-10 md:pb-16">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-4 fade-up-stagger">
          <FeatureCard
            emoji="🕯"
            title={t('landing.feature1Title')}
            body={t('landing.feature1Body')}
          />
          <FeatureCard
            emoji="✦"
            title={t('landing.feature2Title')}
            body={t('landing.feature2Body')}
          />
          <FeatureCard
            emoji="🪪"
            title={t('landing.feature3Title')}
            body={t('landing.feature3Body')}
          />
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="px-6 py-6 text-center text-xs text-(--color-fg-subtle) safe-bottom">
        <p>{t('landing.footer')}</p>
      </footer>
    </main>
  );
}

function FeatureCard({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white/60 backdrop-blur-sm border border-(--color-border)/60 p-5 hover:bg-white hover:border-(--color-gold)/30 transition-all">
      <div className="text-2xl mb-2">{emoji}</div>
      <h3 className="font-serif text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-(--color-fg-muted) leading-relaxed">{body}</p>
    </div>
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
