import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { HebrewCalendarCard } from './_HebrewCalendarCard';
import { PastelCard, Chip } from '@/app/_components/ui/Card';

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
      <div className="mb-6 md:mb-8">
        <div className="text-sm text-(--color-fg-muted) mb-1">
          {greeting.emoji} {greeting.text}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold leading-tight">
          Шалом, <span className="italic">{firstName}</span>
        </h1>
      </div>

      {/* ── AI Rabbi scenarios — the heart of the home ────────────────────── */}
      <section className="mb-10">
        <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-5">
          Что у тебя на душе сегодня?
        </h2>
        <div className="grid grid-cols-2 gap-3">
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

      {/* ── AI Rabbi proactive card (placeholder until Phase B) ─────────── */}
      <section className="mb-10">
        <div className="rounded-2xl bg-(--color-deep) text-white p-5 md:p-6 relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -right-10 -top-10 w-44 h-44 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, var(--color-gold), transparent)' }}
          />
          <div className="flex items-start gap-3 relative">
            <div className="shrink-0 w-9 h-9 rounded-full bg-(--color-gold) text-(--color-deep) flex items-center justify-center text-base">
              ✦
            </div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-(--color-gold) mb-1">
                AI Раввин · Скоро
              </div>
              <p className="text-base leading-relaxed">
                Когда AI запустится, здесь будут персональные предложения по твоим интересам,
                расписанию и общине. Например: «Заметил что ты сохранил 3 шаббат-ужина — забронировать на пятницу?»
              </p>
            </div>
          </div>
        </div>
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

      {/* ── My profile snapshot ──────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-xl font-semibold">Мой профиль</h2>
          <Link
            href="/dashboard/me"
            className="text-sm text-(--color-fg-muted) hover:text-(--color-deep)"
          >
            Открыть →
          </Link>
        </div>
        <div className="rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 p-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <dt className="text-(--color-fg-muted)">Еврейское имя</dt>
            <dd className="font-medium">{profile?.hebrew_name ?? '—'}</dd>
            <dt className="text-(--color-fg-muted)">Направление</dt>
            <dd className="font-medium">{profile?.denomination ?? '—'}</dd>
            <dt className="text-(--color-fg-muted)">Соблюдение</dt>
            <dd className="font-medium">{profile?.observance_level ?? '—'}</dd>
          </dl>
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
