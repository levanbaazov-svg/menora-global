// Цдака — благотворительные сборы с целью и прогрессом.
// Демо: данные из lib/tzedakah/campaigns.ts, реальных платежей нет.

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { HandCoins, CheckCircle2 } from 'lucide-react';
import {
  getActiveCampaigns, getCompletedCampaigns, progressPercent, formatUah,
  type TzedakahCampaign,
} from '@/lib/tzedakah/campaigns';

export default async function TzedakahPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const t = await getTranslations('tzedakah');
  const active = getActiveCampaigns();
  const completed = getCompletedCampaigns();

  return (
    <div className="container mx-auto max-w-xl w-full px-4 md:px-6 pt-3 pb-10">
      <header className="px-0.5 mb-5">
        <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{t('intro')}</p>
      </header>

      <section className="space-y-3">
        {active.map((c) => (
          <CampaignCard key={c.slug} c={c} t={t} />
        ))}
      </section>

      {completed.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} strokeWidth={2.2} className="text-primary" />
            {t('completed')}
          </h2>
          <div className="space-y-3">
            {completed.map((c) => (
              <CampaignCard key={c.slug} c={c} t={t} />
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-xs text-muted-foreground/70 mt-10">
        {t('demoNote')}
      </p>
    </div>
  );
}

async function CampaignCard({
  c, t,
}: {
  c: TzedakahCampaign;
  t: Awaited<ReturnType<typeof getTranslations<'tzedakah'>>>;
}) {
  const pct = progressPercent(c);
  return (
    <Link
      href={`/dashboard/tzedakah/${c.slug}`}
      className="group block overflow-hidden rounded-2xl bg-card ring-1 ring-border/70 hover:ring-primary/30 transition-all"
    >
      {c.imageUrl && (
        <div className="relative h-36 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.imageUrl}
            alt={c.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {!c.active && (
            <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-foreground">
              <CheckCircle2 size={12} strokeWidth={2.2} className="text-primary" />
              {t('goalReached')}
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <h3 className="font-serif text-base font-semibold leading-snug">{c.title}</h3>
        {(c.org || c.city) && (
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {[c.org, c.city].filter(Boolean).join(' · ')}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{c.teaser}</p>

        {/* Progress */}
        <div className="mt-3">
          {pct !== null && (
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${c.active ? 'bg-primary' : 'bg-primary/60'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          <div className="mt-1.5 flex items-baseline justify-between text-xs">
            <span className="font-semibold text-foreground tabular-nums">
              {formatUah(c.raised)}
              {c.goal && (
                <span className="font-normal text-muted-foreground"> {t('of')} {formatUah(c.goal)}</span>
              )}
            </span>
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <HandCoins size={12} strokeWidth={2} />
              {t('donations', { count: c.donationsCount })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
