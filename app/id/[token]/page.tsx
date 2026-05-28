// /id/[token] — public verification page. NO auth required. Renders the card
// view-only so anyone scanning the QR can verify community membership.

import { fetchPublicCardByToken, publicCardUrl, qrSvgFor } from '@/lib/jewish-id';
import { IdCard, DisabledCardPlaceholder } from '@/app/dashboard/me/jewish-id/IdCard';
import { headers } from 'next/headers';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PublicJewishIdPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Basic UUID validation to fail fast on garbage tokens
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return <NotFoundLayout />;
  }

  const card = await fetchPublicCardByToken(token);
  if (!card) return <NotFoundLayout />;

  const h = await headers();
  const host = h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = host ? `${proto}://${host}` : (process.env.NEXTAUTH_URL ?? '');
  const url = publicCardUrl(card.token, origin);
  const qrSvg = await qrSvgFor(url);

  return (
    <main className="min-h-screen flex flex-col bg-(--color-bg) py-10 px-5">
      <Header />

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-5 text-center">
            <div className="text-xs uppercase tracking-widest text-(--color-gold) mb-1">
              Verified
            </div>
            <h1 className="font-serif text-2xl font-semibold">
              Этот человек — часть Menorah
            </h1>
            <p className="text-sm text-(--color-fg-muted) mt-1">
              Подтверждено его общиной
            </p>
          </div>

          <IdCard card={card} qrSvg={qrSvg} publicUrl={url} />

          <p className="text-center text-xs text-(--color-fg-subtle) mt-5">
            Жми/наводи на ❌ если карта выглядит подозрительно — мы расследуем
          </p>
        </div>
      </div>

      <Footer />
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

function Footer() {
  return (
    <footer className="text-center text-xs text-(--color-fg-muted) mt-10">
      <p>
        Menorah Global — еврейская сеть общин по всему миру
      </p>
      <Link
        href="/"
        className="inline-block mt-2 text-(--color-gold-dark) hover:underline"
      >
        Что такое Menorah? →
      </Link>
    </footer>
  );
}

function NotFoundLayout() {
  return (
    <main className="min-h-screen flex flex-col bg-(--color-bg) py-10 px-5">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <DisabledCardPlaceholder />
      </div>
      <Footer />
    </main>
  );
}
