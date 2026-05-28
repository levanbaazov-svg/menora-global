import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { HebrewCalendarCard } from './_HebrewCalendarCard';
import { PastelCard, Chip } from '@/app/_components/ui/Card';
import { getTodayFeatured, KIND_LABELS } from '@/lib/inspiration/library';
import { DailyHomeCard } from '@/app/_components/ai/DailyHomeCard';
import { Suspense } from 'react';

// ── GraphQL ──────────────────────────────────────────────────────────────────
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
    legal_first_name: string | null; hebrew_name: string | null;
    denomination: string | null; observance_level: string | null;
  } | null;
  memberships: Array<{
    role: 'member' | 'rabbi' | 'admin';
    community: { id: string; slug: string; name: string; city: string | null; country_code: string | null; timezone: string };
  }>;
  pending: { aggregate: { count: number } | null };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 5)  return { text: 'Глубокая ночь', emoji: '🌙' };
  if (h < 12) return { text: 'Доброе утро', emoji: '☀️' };
  if (h < 17) return { text: 'Добрый день',  emoji: '🌤' };
  if (h < 21) return { text: 'Добрый вечер', emoji: '🌇' };
  return { text: 'Доброй ночи', emoji: '✨' };
}

// ── Scenario tiles — exactly like Lovable home ──────────────────────────────
const SCENARIOS = [
  {
    href: '/dashboard/ai-rabbi/purpose',
    tint: 'yellow' as const,
    title: 'Найти себя',
    subtitle: 'Духовный диалог',
  },
  {
    href: '/dashboard/ai-rabbi/shabbat',
    tint: 'lavender' as const,
    title: 'Спланировать Шаббат',
    subtitle: 'Ужины рядом с тобой',
  },
  {
    href: '/dashboard/ai-rabbi/hebrew-school',
    tint: 'mint' as const,
    title: 'Hebrew school',
    subtitle: 'Школа для детей',
  },
  {
    href: '/dashboard/ai-rabbi/parsha',
    tint: 'rose' as const,
    title: 'Парша недели',
    subtitle: '5-минутная мудрость',
  },
  {
    href: '/dashboard/ai-rabbi/meet-people',
    tint: 'sky' as const,
    title: 'Найти своих',
    subtitle: 'Знакомства и встречи',
  },
  {
    href: '/dashboard/ai-rabbi/struggling',
    tint: 'cream' as const,
    title: 'Мне тяжело',
    subtitle: 'Безопасное пространство',
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────
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
    <div className="max-w-5xl mx-auto px-5 md:px-6 pt-6 pb-12 fade-up">
      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div className="mb-7 md:mb-9">
        <div className="text-xs uppercase tracking-[0.15em] text-(--color-fg-muted) mb-2 flex items-center gap-1.5">
          <span>{greeting.emoji}</span>
          <span>{greeting.text}</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold leading-[1.05] tracking-tight">
          Шалом, <em className="italic font-normal text-(--color-gold-dark)">{firstName}</em>
        </h1>
      </div>

      {/* ── AI proactive card (today's personalized hint) ─────────────────── */}
      <section className="mb-8">
        <Suspense fallback={<div className="h-32 skeleton rounded-2xl" />}>
          <DailyHomeCard userId={session.user.id} />
        </Suspense>
      </section>

      {/* ── AI Rabbi scenarios — the heart of the home ────────────────────── */}
      <section className="mb-10">
        <header className="mb-5 flex items-end justify-between gap-3">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold leading-tight">
            Что у тебя на душе сегодня?
          </h2>
          <Link
            href="/dashboard/ai-rabbi"
            className="shrink-0 text-xs text-(--color-fg-muted) hover:text-(--color-deep) transition-colors whitespace-nowrap"
          >
            Все →
          </Link>
        </header>
        <div className="grid grid-cols-2 gap-3 fade-up-stagger">
          {SCENARIOS.map((s) => (
            <PastelCard
              key={s.href}
              tint={s.tint}
              title={s.title}
              subtitle={s.subtitle}
              href={s.href}
            />
          ))}
        </div>
      </section>

      {/* ── Inspire — today's pick ─────────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-xl font-semibold">✦ Сегодня для души</h2>
          <Link
            href="/dashboard/inspire"
            className="text-sm text-(--color-fg-muted) hover:text-(--color-deep)"
          >
            Вся библиотека →
          </Link>
        </div>
        {(() => {
          const today = getTodayFeatured();
          const meta = KIND_LABELS[today.kind];
          return (
            <Link
              href={`/dashboard/inspire/${today.slug}`}
              className="group block rounded-2xl overflow-hidden relative hover:scale-[1.005] transition-transform"
            >
              <div className={`relative bg-gradient-to-br ${today.gradient} p-5 md:p-6 min-h-44 text-white flex flex-col justify-end`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest bg-white/90 text-(--color-deep) px-2 py-0.5 rounded-full font-medium">
                    {meta.emoji} {meta.ru}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-white font-medium">
                    {today.readingTimeMinutes} мин
                  </span>
                </div>
                <div className="absolute top-4 right-4 text-3xl drop-shadow-lg">{today.emoji}</div>
                <div className="relative">
                  <h3 className="font-serif text-xl md:text-2xl font-semibold leading-tight drop-shadow-md mb-1">
                    {today.title}
                  </h3>
                  {today.subtitle && (
                    <p className="text-sm opacity-95">{today.subtitle}</p>
                  )}
                </div>
              </div>
            </Link>
          );
        })()}
      </section>

      {/* ── Two-column: My community + Today's calendar ──────────────────── */}
      {memberships.length > 0 && myCommunity && (
        <section className="mb-10 grid gap-6 md:grid-cols-[1fr_320px]">
          <div>
            <h2 className="font-serif text-xl font-semibold mb-4">Моя община</h2>
            <Link
              href={`/dashboard/community`}
              className="block rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 p-5 hover:border-(--color-gold)/40 hover:shadow-[var(--shadow-md)] transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className="shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: 'linear-gradient(135deg, var(--color-gold-soft), var(--color-pastel-yellow))' }}
                >
                  🕍
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-serif text-xl font-semibold">{myCommunity.name}</h3>
                    <Chip tone={myRole === 'admin' ? 'dark' : myRole === 'rabbi' ? 'gold' : 'neutral'} size="xs">
                      {myRole}
                    </Chip>
                  </div>
                  {myCommunity.city && (
                    <p className="text-sm text-(--color-fg-muted)">📍 {myCommunity.city}</p>
                  )}
                  <p className="text-xs text-(--color-fg-subtle) mt-2">
                    Открыть город-гид · места, программы, события →
                  </p>
                </div>
              </div>
            </Link>

            {pendingCount > 0 && (
              <p className="text-xs text-(--color-warning) mt-2">
                У тебя {pendingCount} {pendingCount === 1 ? 'заявка ожидает' : 'заявок ожидают'} рассмотрения
              </p>
            )}
          </div>

          <aside>
            <HebrewCalendarCard community={myCommunity} />
          </aside>
        </section>
      )}

      {/* ── Action tiles ─────────────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="font-serif text-xl font-semibold mb-4">Дальше</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ActionTile icon="📅" label="События" hint="RSVP · создать" href="/dashboard/events" />
          <ActionTile icon="🙋" label="Просьбы" hint="Помоги · попроси" href="/dashboard/requests" />
          <ActionTile icon="🕯" label="Рутины" hint="Молитвы · стрик" href="/dashboard/routines" />
          <ActionTile icon="👥" label="Участники" hint="Кто в общине" href="/dashboard/people" />
        </div>
      </section>

      {/* ── Admin section ────────────────────────────────────────────────── */}
      {isStaff && (
        <section className="mb-10">
          <h2 className="font-serif text-xl font-semibold mb-4">Управление</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ActionTile icon="✓" label="Заявки" hint="Одобрить · роли" href="/dashboard/members" tone="gold" />
            <ActionTile icon="✉️" label="Приглашения" hint="Пригласить" href="/dashboard/invitations" tone="gold" />
          </div>
        </section>
      )}

      {/* ── My profile + Jewish ID promo ─────────────────────────────────── */}
      <section className="mb-12 grid gap-4 md:grid-cols-2">
        {/* Profile snapshot */}
        <div>
          <header className="mb-3 flex items-end justify-between">
            <h2 className="font-serif text-lg font-semibold">Мой профиль</h2>
            <Link
              href="/dashboard/me"
              className="text-xs text-(--color-fg-muted) hover:text-(--color-deep) transition-colors"
            >
              Открыть →
            </Link>
          </header>
          <div className="rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/70 p-5 shadow-[var(--shadow-sm)] h-full">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
              <dt className="text-(--color-fg-muted) text-xs uppercase tracking-wider">Еврейское имя</dt>
              <dd className="font-medium font-serif">{profile?.hebrew_name ?? '—'}</dd>
              <dt className="text-(--color-fg-muted) text-xs uppercase tracking-wider">Направление</dt>
              <dd className="font-medium">{profile?.denomination ?? '—'}</dd>
              <dt className="text-(--color-fg-muted) text-xs uppercase tracking-wider">Соблюдение</dt>
              <dd className="font-medium">{profile?.observance_level ?? '—'}</dd>
            </dl>
          </div>
        </div>

        {/* Jewish ID promo */}
        <div>
          <header className="mb-3 flex items-end justify-between">
            <h2 className="font-serif text-lg font-semibold">🪪 Jewish ID</h2>
            <Link
              href="/dashboard/me/jewish-id"
              className="text-xs text-(--color-fg-muted) hover:text-(--color-deep) transition-colors"
            >
              Открыть карту →
            </Link>
          </header>
          <Link
            href="/dashboard/me/jewish-id"
            className="group relative block rounded-2xl overflow-hidden h-full p-5 text-white shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] transition-all"
            style={{
              background: 'linear-gradient(135deg, #14181F 0%, #232838 45%, #C99B43 130%)',
            }}
          >
            <div
              aria-hidden
              className="absolute -top-12 -right-10 w-40 h-40 rounded-full opacity-40 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #C99B43 0%, transparent 70%)' }}
            />
            <div className="relative">
              <div className="text-[10px] uppercase tracking-[0.2em] text-(--color-gold) mb-2 font-semibold">
                ✦ Цифровой паспорт
              </div>
              <p className="text-sm leading-relaxed mb-3 opacity-90">
                QR-код для подтверждения членства в любой общине Menorah.
                Покажи — и тебя примут как своего.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold transition-transform group-hover:translate-x-1">
                Открыть мою карту <span>→</span>
              </span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

// ── ActionTile ────────────────────────────────────────────────────────────────
function ActionTile({
  icon, label, hint, href, tone = 'default',
}: {
  icon: string; label: string; hint: string; href: string; tone?: 'default' | 'gold';
}) {
  const bgClass = tone === 'gold' ? 'bg-(--color-gold-soft)/40 border-(--color-gold)/30' : '';
  return (
    <Link
      href={href}
      className={`group block rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 p-4 hover:border-(--color-gold)/40 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 active:translate-y-0 transition-all ${bgClass}`}
    >
      <div className="flex flex-col items-start gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-(--color-muted-bg) group-hover:bg-(--color-gold-soft) flex items-center justify-center text-lg transition-colors">
          {icon}
        </div>
        <div>
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-xs text-(--color-fg-muted) mt-0.5">{hint}</div>
        </div>
      </div>
    </Link>
  );
}
