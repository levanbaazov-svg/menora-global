// /id/[token] — public verification page. NO auth required. Renders the card
// view-only so anyone scanning the QR can verify community membership.

import { fetchPublicCardByToken, publicCardUrl, qrDataUrlFor } from '@/lib/jewish-id';
import { IdCard, DisabledCardPlaceholder } from '@/app/dashboard/me/jewish-id/IdCard';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { type Locale } from '@/i18n/config';

export const dynamic = 'force-dynamic';

type Translator = (key: string, values?: Record<string, string | number>) => string;

export default async function PublicJewishIdPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations('personal');
  const locale = (await getLocale()) as Locale;

  // Basic UUID validation to fail fast on garbage tokens
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return <NotFoundLayout t={t} />;
  }

  const card = await fetchPublicCardByToken(token);
  if (!card) return <NotFoundLayout t={t} />;

  const h = await headers();
  const host = h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = host ? `${proto}://${host}` : (process.env.NEXTAUTH_URL ?? '');
  const url = publicCardUrl(card.token, origin);
  const qrDataUrl = await qrDataUrlFor(url);

  return (
    <main className="min-h-screen flex flex-col bg-(--color-bg) py-10 px-5">
      <Header />

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-5 text-center">
            <div className="text-xs uppercase tracking-widest text-(--color-gold) mb-1">
              {t('jewishId.public.verified')}
            </div>
            <h1 className="font-serif text-2xl font-semibold">
              {t('jewishId.public.title')}
            </h1>
            <p className="text-sm text-(--color-fg-muted) mt-1">
              {t('jewishId.public.subtitle')}
            </p>
          </div>

          <IdCard card={card} qrDataUrl={qrDataUrl} publicUrl={url} t={t} locale={locale} />

          <p className="text-center text-xs text-(--color-fg-subtle) mt-5">
            {t('jewishId.public.suspicious')}
          </p>
        </div>
      </div>

      <Footer t={t} />
    </main>
  );
}

function Header() {
  return (
    <header className="text-center mb-6">
      <Link href="/" className="inline-flex items-center gap-2">
        <span className="text-(--color-gold) text-xl">✦</span>
        <span className="font-serif italic text-lg font-semibold">Menorah</span>
      </Link>
    </header>
  );
}

function Footer({ t }: { t: Translator }) {
  return (
    <footer className="text-center text-xs text-(--color-fg-muted) mt-10">
      <p>
        {t('jewishId.public.footerTagline')}
      </p>
      <Link
        href="/"
        className="inline-block mt-2 text-(--color-gold-dark) hover:underline"
      >
        {t('jewishId.public.whatIsMenorah')}
      </Link>
    </footer>
  );
}

function NotFoundLayout({ t }: { t: Translator }) {
  return (
    <main className="min-h-screen flex flex-col bg-(--color-bg) py-10 px-5">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <DisabledCardPlaceholder t={t} />
      </div>
      <Footer t={t} />
    </main>
  );
}
