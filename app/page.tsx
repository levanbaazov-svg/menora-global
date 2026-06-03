import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { GoogleSignInButton } from '@/app/_components/auth/GoogleSignInButton';

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

          <GoogleSignInButton label={t('landing.signInGoogle')} />

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
