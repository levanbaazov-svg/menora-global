// Цдака — детальная страница сбора: фото, прогресс, описание, демо-донат.

import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ChevronLeft, HandCoins, CheckCircle2, CalendarDays } from 'lucide-react';
import { getCampaignBySlug, progressPercent, formatUah } from '@/lib/tzedakah/campaigns';
import { DonatePanel } from '../DonatePanel';

export default async function TzedakahDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const t = await getTranslations('tzedakah');
  const { slug } = await params;
  const c = getCampaignBySlug(slug);
  if (!c) notFound();

  const pct = progressPercent(c);

  return (
    <div className="container mx-auto max-w-xl w-full px-4 md:px-6 pt-3 pb-10">
      <Link
        href="/dashboard/tzedakah"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={15} strokeWidth={2.2} className="rtl:-scale-x-100" />
        {t('title')}
      </Link>

      {c.imageUrl && (
        <div className="relative h-48 md:h-56 rounded-2xl overflow-hidden mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.imageUrl} alt={c.title} className="h-full w-full object-cover" />
          {!c.active && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-foreground">
              <CheckCircle2 size={12} strokeWidth={2.2} className="text-primary" />
              {t('goalReached')}
            </span>
          )}
        </div>
      )}

      <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight">{c.title}</h1>
      {(c.org || c.city) && (
        <div className="text-xs text-muted-foreground mt-1">
          {[c.org, c.city].filter(Boolean).join(' · ')}
        </div>
      )}

      {/* Progress */}
      <div className="mt-4 rounded-2xl bg-card ring-1 ring-border/70 p-4">
        {pct !== null && (
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${c.active ? 'bg-primary' : 'bg-primary/60'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <div className="font-serif text-xl font-semibold tabular-nums">{formatUah(c.raised)}</div>
            {c.goal && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {t('ofGoal', { goal: formatUah(c.goal) })}{pct !== null ? ` · ${pct}%` : ''}
              </div>
            )}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1">
              <HandCoins size={12} strokeWidth={2} />
              {t('donations', { count: c.donationsCount })}
            </div>
            {c.endsAt && (
              <div className="mt-0.5 inline-flex items-center gap-1">
                <CalendarDays size={12} strokeWidth={2} />
                {t('until', { date: new Date(c.endsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Donate */}
      <div className="mt-4">
        <DonatePanel disabled={!c.active} />
      </div>

      {/* Body */}
      <article className="mt-6 space-y-4 text-[15px] leading-relaxed text-foreground/90">
        {c.body.split(/\n\n+/).map((p, i) => (
          <p key={i}>{renderInline(p.trim())}</p>
        ))}
      </article>

      <p className="text-center text-xs text-muted-foreground/70 mt-10">{t('demoNote')}</p>
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>,
  );
}
