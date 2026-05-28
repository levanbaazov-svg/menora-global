// /dashboard/me/jewish-id — own card + controls (regenerate QR, disable).

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { fetchOwnCard, qrSvgFor, publicCardUrl } from '@/lib/jewish-id';
import { IdCard } from './IdCard';
import { JewishIdControls } from './JewishIdControls';
import { EmptyState } from '@/app/_components/ui/EmptyState';
import { headers } from 'next/headers';

export default async function MyJewishIdPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const card = await fetchOwnCard(session.user.id);
  if (!card) {
    return (
      <div className="max-w-2xl mx-auto px-5 md:px-6 pt-2 pb-12">
        <EmptyState
          emoji="🪪"
          title="Профиль не найден"
          description="Что-то пошло не так. Попробуй перезагрузить страницу."
        />
      </div>
    );
  }

  // Resolve absolute origin from runtime headers (works on Vercel + local).
  const h = await headers();
  const host = h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = host ? `${proto}://${host}` : (process.env.NEXTAUTH_URL ?? '');

  const publicUrl = publicCardUrl(card.token, origin);
  const qrSvg = card.enabled ? await qrSvgFor(publicUrl) : '';

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-6 pt-2 pb-12">
      <Link
        href="/dashboard/me"
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← Мой профиль
      </Link>

      <header className="mb-8 text-center md:text-left">
        <div className="text-xs uppercase tracking-widest text-(--color-gold) mb-1">
          Jewish ID
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight">
          Твой цифровой паспорт
        </h1>
        <p className="text-sm text-(--color-fg-muted) mt-2 max-w-xl">
          Покажи QR в любой общине Menorah — за пару секунд подтвердят что ты член.
          Никакой личной инфы кроме того что показано на карте.
        </p>
      </header>

      <div className="grid md:grid-cols-[1fr_280px] gap-8 items-start">
        {/* The card itself */}
        <div>
          {card.enabled ? (
            <IdCard card={card} qrSvg={qrSvg} publicUrl={publicUrl} />
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-(--color-border) p-10 text-center">
              <div className="text-5xl mb-4 opacity-40">🔒</div>
              <h3 className="font-serif text-xl font-semibold mb-2">ID отключён</h3>
              <p className="text-sm text-(--color-fg-muted) mb-4">
                Никто не сможет открыть твою публичную страницу по QR.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar — meta + controls */}
        <aside className="space-y-5">
          <section>
            <h3 className="text-xs uppercase tracking-widest text-(--color-fg-muted) mb-2">
              Публичная ссылка
            </h3>
            <div className="rounded-xl bg-(--color-bg-elevated) border border-(--color-border)/60 px-3 py-2 text-xs break-all font-mono text-(--color-fg-muted)">
              {publicUrl}
            </div>
            <a
              href={publicUrl}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-(--color-gold-dark) hover:underline mt-1 inline-block"
            >
              Открыть как чужой →
            </a>
          </section>

          <JewishIdControls
            enabled={card.enabled}
            regeneratedAt={card.regenerated_at}
          />

          <section className="rounded-2xl bg-(--color-pastel-cream) border border-(--color-gold)/20 p-4">
            <div className="text-xs font-semibold mb-1">Что показывается публично</div>
            <ul className="text-xs text-(--color-fg-muted) space-y-1 list-disc list-inside">
              <li>Имя + еврейское имя</li>
              <li>Фото профиля</li>
              <li>Община, город, роль</li>
              <li>Дата вступления</li>
            </ul>
            <div className="text-xs font-semibold mt-3 mb-1">Что НЕ показывается</div>
            <ul className="text-xs text-(--color-fg-muted) space-y-1 list-disc list-inside">
              <li>Телефон, email, адрес</li>
              <li>Семья, дата рождения</li>
              <li>Любые приватные настройки</li>
            </ul>
          </section>
        </aside>
      </div>

      {/* How-to */}
      <section className="mt-12 border-t border-(--color-border) pt-8">
        <h2 className="font-serif text-xl font-semibold mb-4">Как использовать</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <HowTo n="1" title="Покажи QR" body="При визите в другую синагогу или на шаббатний ужин — открой карту, дай отсканировать." />
          <HowTo n="2" title="Они сканируют" body="Камера телефона распознаёт QR и открывает страницу подтверждения." />
          <HowTo n="3" title="Готово" body="На их экране — твоя карта. Никаких звонков раввину, никаких форм." />
        </div>
      </section>
    </div>
  );
}

function HowTo({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 p-4">
      <div className="w-8 h-8 rounded-full bg-(--color-gold-soft) text-(--color-gold-dark) flex items-center justify-center font-serif text-base font-semibold mb-2">
        {n}
      </div>
      <div className="font-semibold text-sm">{title}</div>
      <p className="text-xs text-(--color-fg-muted) mt-1 leading-relaxed">{body}</p>
    </div>
  );
}
