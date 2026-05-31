// Dashboard home — Lovable layout, lucide everywhere, no emoji icons.
// Goal: scenarios + AI card + routine all fit in one viewport (no long scroll).

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { Reveal } from '@/components/motion/Reveal';
import { ScenarioTile, type ScenarioTint } from './_ScenarioTile';
import { DailyHomeCard } from '@/app/_components/ai/DailyHomeCard';
import { RoutineHomeCard } from './_RoutineHomeCard';

const SCENARIOS: Array<{ href: string; title: string; subtitle: string; tint: ScenarioTint }> = [
  { href: '/dashboard/ai-rabbi/purpose',       tint: 'yellow',   title: 'Найти себя',          subtitle: 'Духовный диалог' },
  { href: '/dashboard/ai-rabbi/shabbat',       tint: 'lavender', title: 'Спланировать Шаббат', subtitle: 'Ужины рядом' },
  { href: '/dashboard/ai-rabbi/hebrew-school', tint: 'mint',     title: 'Hebrew school',       subtitle: 'Школа для детей' },
  { href: '/dashboard/ai-rabbi/parsha',        tint: 'rose',     title: 'Парша недели',        subtitle: '5-минутная мудрость' },
  { href: '/dashboard/ai-rabbi/meet-people',   tint: 'sky',      title: 'Найти своих',         subtitle: 'Знакомства' },
  { href: '/dashboard/ai-rabbi/struggling',    tint: 'cream',    title: 'Мне тяжело',          subtitle: 'Безопасно' },
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
  const firstName =
    data.user_profiles_by_pk?.legal_first_name
    ?? session.user.name?.split(' ')[0]
    ?? 'друг';

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-4 space-y-4">
      {/* 1. Greeting + question (compact) */}
      <Reveal>
        <header className="px-0.5">
          <h1 className="font-serif text-[26px] md:text-3xl font-semibold leading-[1.05] tracking-tight">
            Шалом, <em className="italic font-normal text-primary">{firstName}</em>
          </h1>
          <h2 className="font-serif text-base text-foreground/70 mt-1">
            Что у тебя на душе сегодня?
          </h2>
        </header>
      </Reveal>

      {/* 2. Scenario tiles — compact 2-col grid */}
      <section className="grid grid-cols-2 gap-2.5">
        {SCENARIOS.map((s, i) => (
          <ScenarioTile
            key={s.href}
            href={s.href}
            title={s.title}
            subtitle={s.subtitle}
            tint={s.tint}
            index={i}
          />
        ))}
      </section>

      {/* 3. AI proactive card */}
      <DailyHomeCard userId={session.user.id} />

      {/* 4. Routines */}
      <Reveal delay={0.1}>
        <RoutineHomeCard userId={session.user.id} />
      </Reveal>
    </div>
  );
}
