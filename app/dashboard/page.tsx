// Dashboard home — Lovable layout, lucide everywhere, no emoji icons.
// Goal: scenarios + AI card + routine all fit in one viewport (no long scroll).

import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Reveal } from '@/components/motion/Reveal';
import { ScenarioTile, type ScenarioTint } from './_ScenarioTile';
import { DailyHomeCard } from '@/app/_components/ai/DailyHomeCard';
import { HomeAskBar } from '@/app/_components/ai/HomeAskBar';
import { RoutineHomeCard } from './_RoutineHomeCard';
import { TzedakahHomeCard } from './_TzedakahHomeCard';
import { ServicesHomeCard } from './_ServicesHomeCard';

const SCENARIOS: Array<{ href: string; key: string; tint: ScenarioTint }> = [
  { href: '/dashboard/ai-rabbi/purpose',       tint: 'yellow',   key: 'purpose' },
  { href: '/dashboard/ai-rabbi/shabbat',       tint: 'lavender', key: 'shabbat' },
  { href: '/dashboard/ai-rabbi/hebrew-school', tint: 'mint',     key: 'hebrewSchool' },
  { href: '/dashboard/ai-rabbi/parsha',        tint: 'rose',     key: 'parsha' },
  { href: '/dashboard/ai-rabbi/meet-people',   tint: 'sky',      key: 'meetPeople' },
  { href: '/dashboard/ai-rabbi/struggling',    tint: 'cream',    key: 'struggling' },
];

const FETCH = /* GraphQL */ `
  query DashboardHome($user_id: uuid!) {
    user_profiles_by_pk(user_id: $user_id) { legal_first_name }
  }
`;

interface Data {
  user_profiles_by_pk: { legal_first_name: string | null } | null;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const data = await hasuraAdmin.request<Data>(FETCH, { user_id: session.user.id });
  const t = await getTranslations('home');
  const firstName =
    data.user_profiles_by_pk?.legal_first_name
    ?? session.user.name?.split(' ')[0]
    ?? t('friend');

  return (
    <div className="container mx-auto max-w-xl w-full px-4 md:px-6 pt-2 pb-2 flex flex-col gap-2">
      {/* 1. Greeting + question (compact) */}
      <Reveal>
        <header className="px-0.5">
          <h1 className="font-serif text-[21px] md:text-2xl font-semibold leading-[1.1] tracking-tight">
            {t.rich('greeting', {
              name: firstName,
              accent: (chunks) => <em className="italic font-normal text-primary">{chunks}</em>,
            })}
          </h1>
          <h2 className="font-serif text-[13px] text-foreground/70 mt-0.5">
            {t('prompt')}
          </h2>
        </header>
      </Reveal>

      {/* 2. Scenario tiles — 2-col grid */}
      <section className="grid grid-cols-2 gap-2">
        {SCENARIOS.map((s, i) => (
          <ScenarioTile
            key={s.href}
            scenarioSlug={s.href.split('/').pop() as string}
            title={t(`scenarios.${s.key}Title`)}
            subtitle={t(`scenarios.${s.key}Subtitle`)}
            tint={s.tint}
            index={i}
          />
        ))}
      </section>

      {/* 3. AI proactive card — streamed via Suspense so the shell paints fast */}
      <Suspense fallback={<div className="h-[68px] rounded-[18px] bg-foreground/[0.06] animate-pulse" />}>
        <DailyHomeCard userId={session.user.id} communityId={session.hasura.community_id} />
      </Suspense>

      {/* 4. Routine */}
      <Suspense fallback={<div className="h-20 rounded-2xl bg-foreground/[0.06] animate-pulse" />}>
        <RoutineHomeCard userId={session.user.id} />
      </Suspense>

      {/* 5. Цдака */}
      <TzedakahHomeCard />

      {/* 6. Сервисы общины */}
      <ServicesHomeCard />

      {/* 7. Free-chat bar */}
      <HomeAskBar />
    </div>
  );
}
