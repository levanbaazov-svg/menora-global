// Dashboard home — rebuilt on shadcn + motion.
// Composition (top → bottom):
//   1. Greeting hero (warm intro)
//   2. AI Rabbi scenario tiles (6, conversational entry)
//   3. Daily AI suggestion card (proactive)
//   4. Two-column: My community + Hebrew calendar
//   5. Quick actions grid
//   6. Profile snapshot + Jewish ID promo

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HebrewCalendarCard } from './_HebrewCalendarCard';
import { DailyHomeCard } from '@/app/_components/ai/DailyHomeCard';
import { StaggerChildren, Reveal } from '@/components/motion/Reveal';
import {
  Compass, HandHeart, Flame, Users, ChevronRight,
  Building2, ScanLine, Sparkles,
} from 'lucide-react';

const FETCH_DASHBOARD = /* GraphQL */ `
  query Dashboard($user_id: uuid!) {
    user_profiles_by_pk(user_id: $user_id) {
      legal_first_name hebrew_name denomination observance_level
    }
    memberships(where: { user_id: { _eq: $user_id }, status: { _eq: active } }) {
      role
      community { id slug name city country_code timezone }
    }
    pending: memberships_aggregate(
      where: { user_id: { _eq: $user_id }, status: { _eq: pending } }
    ) { aggregate { count } }
  }
`;

interface DashboardData {
  user_profiles_by_pk: {
    legal_first_name: string | null;
    hebrew_name: string | null;
    denomination: string | null;
    observance_level: string | null;
  } | null;
  memberships: Array<{
    role: 'member' | 'rabbi' | 'admin';
    community: { id: string; slug: string; name: string; city: string | null; country_code: string | null; timezone: string };
  }>;
  pending: { aggregate: { count: number } | null };
}

// ── Scenarios — emotional entry-points to AI Rabbi ──────────────────────
const SCENARIOS = [
  { href: '/dashboard/ai-rabbi/purpose',       tint: 'amber',   emoji: '🌟', title: 'Найти себя',          subtitle: 'Духовный диалог' },
  { href: '/dashboard/ai-rabbi/shabbat',       tint: 'violet',  emoji: '🕯', title: 'Спланировать Шаббат', subtitle: 'Ужины рядом с тобой' },
  { href: '/dashboard/ai-rabbi/hebrew-school', tint: 'emerald', emoji: '👶', title: 'Hebrew school',       subtitle: 'Школа для детей' },
  { href: '/dashboard/ai-rabbi/parsha',        tint: 'rose',    emoji: '📖', title: 'Парша недели',        subtitle: '5-минутная мудрость' },
  { href: '/dashboard/ai-rabbi/meet-people',   tint: 'sky',     emoji: '🤝', title: 'Найти своих',         subtitle: 'Знакомства и встречи' },
  { href: '/dashboard/ai-rabbi/struggling',    tint: 'orange',  emoji: '💙', title: 'Мне тяжело',          subtitle: 'Безопасное пространство' },
] as const;

const TINT_BG: Record<string, string> = {
  amber:   'bg-amber-100/60 hover:bg-amber-100',
  violet:  'bg-violet-100/60 hover:bg-violet-100',
  emerald: 'bg-emerald-100/60 hover:bg-emerald-100',
  rose:    'bg-rose-100/60 hover:bg-rose-100',
  sky:     'bg-sky-100/60 hover:bg-sky-100',
  orange:  'bg-orange-100/60 hover:bg-orange-100',
};

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 5)  return { text: 'Глубокая ночь', emoji: '🌙' };
  if (h < 12) return { text: 'Доброе утро',  emoji: '☀️' };
  if (h < 17) return { text: 'Добрый день',  emoji: '🌤' };
  if (h < 21) return { text: 'Добрый вечер', emoji: '🌇' };
  return { text: 'Доброй ночи', emoji: '✨' };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const data = await hasuraAdmin.request<DashboardData>(
    FETCH_DASHBOARD, { user_id: session.user.id },
  );
  const profile = data.user_profiles_by_pk;
  const memberships = data.memberships;
  const pendingCount = data.pending.aggregate?.count ?? 0;
  const firstName = profile?.legal_first_name ?? session.user.name?.split(' ')[0] ?? 'друг';
  const greeting = getGreeting();
  const myCommunity = memberships[0]?.community;
  const myRole = memberships[0]?.role;
  const isStaff = myRole === 'rabbi' || myRole === 'admin';

  return (
    <div className="container mx-auto max-w-6xl px-4 md:px-6 pt-6 pb-12 space-y-10">
      {/* ── Greeting ─────────────────────────────────────────────────── */}
      <Reveal>
        <div>
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">
            <span>{greeting.emoji}</span>
            <span>{greeting.text}</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold leading-[1.05] tracking-tight">
            Шалом,{' '}
            <em className="italic font-normal text-primary">{firstName}</em>
          </h1>
        </div>
      </Reveal>

      {/* ── AI Rabbi scenarios ───────────────────────────────────────── */}
      <section>
        <Reveal delay={0.08}>
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold leading-tight">
              Что у тебя на душе сегодня?
            </h2>
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href="/dashboard/ai-rabbi">
                Все
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Reveal>

        <StaggerChildren
          delayStart={0.12}
          step={0.04}
          className="grid grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {SCENARIOS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`group relative rounded-3xl p-5 min-h-[140px] flex flex-col justify-between
                          transition-all duration-300 hover:scale-[1.02] active:scale-[0.99]
                          ${TINT_BG[s.tint]}`}
            >
              <div className="absolute top-4 right-4 text-2xl drop-shadow-sm">{s.emoji}</div>
              <div>
                <div className="font-serif text-lg font-semibold leading-tight pr-8">
                  {s.title}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{s.subtitle}</div>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background text-sm transition-transform duration-300 group-hover:translate-x-1">
                <ChevronRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </StaggerChildren>
      </section>

      {/* ── Daily AI suggestion ──────────────────────────────────────── */}
      <Reveal delay={0.2}>
        <section>
          <DailyHomeCard userId={session.user.id} />
        </section>
      </Reveal>

      {/* ── My community + Calendar ──────────────────────────────────── */}
      {memberships.length > 0 && myCommunity && (
        <Reveal delay={0.25}>
          <section className="grid gap-4 md:grid-cols-[1fr_320px]">
            <Card className="overflow-hidden">
              <Link
                href="/dashboard/community"
                className="block p-5 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-gold-soft), var(--color-pastel-yellow))',
                    }}
                  >
                    <Building2 className="h-6 w-6 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-serif text-xl font-semibold leading-tight">{myCommunity.name}</h3>
                      <Badge variant={isStaff ? 'default' : 'secondary'} className="text-[10px] uppercase">
                        {myRole}
                      </Badge>
                    </div>
                    {myCommunity.city && (
                      <p className="text-sm text-muted-foreground">{myCommunity.city}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Открыть город-гид · места, программы, события →
                    </p>
                  </div>
                </div>
                {pendingCount > 0 && (
                  <p className="text-xs text-amber-700 mt-3 ml-[3.75rem]">
                    {pendingCount} {pendingCount === 1 ? 'заявка ожидает' : 'заявок ожидают'} рассмотрения
                  </p>
                )}
              </Link>
            </Card>

            <HebrewCalendarCard community={myCommunity} />
          </section>
        </Reveal>
      )}

      {/* ── Quick actions ────────────────────────────────────────────── */}
      <Reveal delay={0.3}>
        <section>
          <h2 className="font-serif text-xl font-semibold mb-4">Дальше</h2>
          <StaggerChildren
            step={0.04}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <ActionTile href="/dashboard/events"    Icon={Compass}    label="События"   hint="RSVP · создать" />
            <ActionTile href="/dashboard/requests"  Icon={HandHeart}  label="Просьбы"   hint="Помоги · попроси" />
            <ActionTile href="/dashboard/routines"  Icon={Flame}      label="Рутины"    hint="Молитвы · стрик" />
            <ActionTile href="/dashboard/people"    Icon={Users}      label="Участники" hint="Кто в общине" />
          </StaggerChildren>
        </section>
      </Reveal>

      {/* ── Profile + Jewish ID promo ────────────────────────────────── */}
      <Reveal delay={0.35}>
        <section className="grid gap-4 md:grid-cols-2">
          {/* Profile snapshot */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-end justify-between mb-3">
                <h2 className="font-serif text-lg font-semibold">Мой профиль</h2>
                <Button asChild variant="ghost" size="sm" className="h-auto -mr-2 -mt-1">
                  <Link href="/dashboard/me">Открыть<ChevronRight className="h-3.5 w-3.5" /></Link>
                </Button>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                <Field label="Еврейское имя" value={profile?.hebrew_name} serif />
                <Field label="Направление"   value={profile?.denomination} />
                <Field label="Соблюдение"    value={profile?.observance_level} />
              </dl>
            </CardContent>
          </Card>

          {/* Jewish ID — dark cinematic card */}
          <Link
            href="/dashboard/me/jewish-id"
            className="group relative block rounded-2xl overflow-hidden p-5 text-white shadow-md hover:shadow-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, #14181F 0%, #232838 45%, #C99B43 130%)',
            }}
          >
            <div
              aria-hidden
              className="absolute -top-12 -right-10 w-40 h-40 rounded-full opacity-40 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #C99B43 0%, transparent 70%)' }}
            />
            <div className="relative flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                <ScanLine className="h-5 w-5 text-amber-300" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300 font-semibold mb-1">
                  ✦ Цифровой паспорт
                </div>
                <div className="font-serif text-lg font-semibold leading-snug mb-1">
                  Jewish ID
                </div>
                <p className="text-sm leading-relaxed opacity-90 mb-3">
                  QR для подтверждения членства в любой общине Menorah.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold transition-transform group-hover:translate-x-1">
                  Открыть карту
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </Link>
        </section>
      </Reveal>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────
function Field({ label, value, serif }: { label: string; value: string | null | undefined; serif?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground text-xs uppercase tracking-wider">{label}</dt>
      <dd className={`font-medium ${serif ? 'font-serif' : ''}`}>{value ?? '—'}</dd>
    </>
  );
}

function ActionTile({
  href, Icon, label, hint,
}: {
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl bg-card border border-border/60 p-4
                 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5
                 active:translate-y-0 transition-all"
    >
      <div className="flex flex-col items-start gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-muted group-hover:bg-accent flex items-center justify-center transition-colors">
          <Icon className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground" />
        </div>
        <div>
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
        </div>
      </div>
    </Link>
  );
}
