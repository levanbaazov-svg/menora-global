// Dashboard home — Apple-native rebuild.
// Pattern: large title + sectioned lists (like iOS Settings).
// One accent color, dense info, no decorative empty space, no pastel tiles.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ListSection, ListRow } from '@/components/ui/list-section';
import { Reveal } from '@/components/motion/Reveal';
import { Badge } from '@/components/ui/badge';
import { ShabbatHero } from './_ShabbatHero';
import { DailyHomeCard } from '@/app/_components/ai/DailyHomeCard';
import {
  Building2, Sparkles, Bot, BookHeart, HandHeart,
  Users, Calendar, ScanLine, Bell, ShieldCheck, MailPlus,
  ChevronRight, BookOpenText,
} from 'lucide-react';

// ── Data ────────────────────────────────────────────────────────────────
const FETCH_DASHBOARD = /* GraphQL */ `
  query Dashboard($user_id: uuid!) {
    user_profiles_by_pk(user_id: $user_id) {
      legal_first_name hebrew_name denomination observance_level
    }
    memberships(where: { user_id: { _eq: $user_id }, status: { _eq: active } }) {
      role
      community { id slug name city country_code timezone }
    }
    pending_membership: memberships_aggregate(
      where: { user_id: { _eq: $user_id }, status: { _eq: pending } }
    ) { aggregate { count } }

    next_event: events(
      where: { status: { _eq: published }, starts_at: { _gte: "now()" } }
      order_by: { starts_at: asc } limit: 1
    ) { id title type starts_at location_text attendee_count_cached max_attendees }

    upcoming_events_count: events_aggregate(
      where: { status: { _eq: published }, starts_at: { _gte: "now()" } }
    ) { aggregate { count } }

    open_requests_count: requests_aggregate(
      where: { status: { _eq: open } }
    ) { aggregate { count } }

    pending_places_count: places_aggregate(
      where: { submission_status: { _eq: pending } }
    ) { aggregate { count } }

    rabbi_open_tasks_count: rabbi_tasks_aggregate(
      where: { status: { _eq: open } }
    ) { aggregate { count } }

    members_count: memberships_aggregate(
      where: { status: { _eq: active } }
    ) { aggregate { count } }

    pending_join_count: memberships_aggregate(
      where: { status: { _eq: pending } }
    ) { aggregate { count } }
  }
`;

interface AggCount { aggregate: { count: number } | null }
interface EventRow {
  id: string; title: string; type: string;
  starts_at: string; location_text: string | null;
  attendee_count_cached: number; max_attendees: number | null;
}
interface DashboardData {
  user_profiles_by_pk: {
    legal_first_name: string | null; hebrew_name: string | null;
    denomination: string | null; observance_level: string | null;
  } | null;
  memberships: Array<{
    role: 'member' | 'rabbi' | 'admin';
    community: { id: string; slug: string; name: string; city: string | null; country_code: string | null; timezone: string };
  }>;
  pending_membership: AggCount;
  next_event: EventRow[];
  upcoming_events_count: AggCount;
  open_requests_count: AggCount;
  pending_places_count: AggCount;
  rabbi_open_tasks_count: AggCount;
  members_count: AggCount;
  pending_join_count: AggCount;
}

// ── Helpers ─────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Глубокая ночь';
  if (h < 12) return 'Доброе утро';
  if (h < 17) return 'Добрый день';
  if (h < 21) return 'Добрый вечер';
  return 'Доброй ночи';
}

function formatEventTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    timeZone: tz, weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Page ────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const data = await hasuraAdmin.request<DashboardData>(
    FETCH_DASHBOARD, { user_id: session.user.id },
  );
  const profile = data.user_profiles_by_pk;
  const memberships = data.memberships;
  const firstName = profile?.legal_first_name ?? session.user.name?.split(' ')[0] ?? 'друг';
  const myCommunity = memberships[0]?.community;
  const myRole = memberships[0]?.role;
  const isStaff = myRole === 'rabbi' || myRole === 'admin';

  const nextEvent = data.next_event[0];
  const upcomingCount = data.upcoming_events_count.aggregate?.count ?? 0;
  const requestsCount = data.open_requests_count.aggregate?.count ?? 0;
  const pendingPlacesCount = data.pending_places_count.aggregate?.count ?? 0;
  const openTasksCount = data.rabbi_open_tasks_count.aggregate?.count ?? 0;
  const membersCount = data.members_count.aggregate?.count ?? 0;
  const pendingJoinCount = data.pending_join_count.aggregate?.count ?? 0;

  return (
    <div className="container mx-auto max-w-2xl px-4 md:px-6 pt-6 pb-12 space-y-6">
      {/* ── Large title ──────────────────────────────────────────────── */}
      <Reveal>
        <header className="px-1">
          <div className="text-xs text-muted-foreground mb-1.5">
            {getGreeting()}
          </div>
          <h1 className="font-serif text-4xl md:text-[40px] font-semibold leading-[1.05] tracking-tight">
            Шалом,{' '}
            <em className="italic font-normal text-primary">{firstName}</em>
          </h1>
        </header>
      </Reveal>

      {/* ── 1. Two-up hero: Shabbat + AI suggestion ──────────────────── */}
      {myCommunity && (
        <Reveal delay={0.06}>
          <div className="grid sm:grid-cols-2 gap-3">
            <ShabbatHero community={myCommunity} />
            <DailyHomeCard userId={session.user.id} />
          </div>
        </Reveal>
      )}

      {/* ── 2. Next event (if any) ───────────────────────────────────── */}
      {nextEvent && myCommunity && (
        <Reveal delay={0.1}>
          <ListSection
            label="Ближайшее событие"
            action={
              upcomingCount > 1 && (
                <Link
                  href="/dashboard/events"
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Все {upcomingCount} →
                </Link>
              )
            }
          >
            <ListRow
              href={`/dashboard/events/${nextEvent.id}`}
              Icon={Calendar}
              tone="primary"
              title={nextEvent.title}
              subtitle={`${formatEventTime(nextEvent.starts_at, myCommunity.timezone)}${nextEvent.location_text ? ` · ${nextEvent.location_text}` : ''}`}
              meta={
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {nextEvent.attendee_count_cached}{nextEvent.max_attendees ? ` / ${nextEvent.max_attendees}` : ''}
                </Badge>
              }
            />
          </ListSection>
        </Reveal>
      )}

      {/* ── 3. AI Rabbi: 6 scenarios as a list ──────────────────────── */}
      <Reveal delay={0.14}>
        <ListSection
          label="AI Раввин"
          action={
            <Link
              href="/dashboard/ai-rabbi"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Открыть →
            </Link>
          }
        >
          <ListRow href="/dashboard/ai-rabbi/purpose"       Icon={Sparkles}   title="Найти себя"           subtitle="Духовный диалог" />
          <ListRow href="/dashboard/ai-rabbi/shabbat"       Icon={Sparkles}   title="Спланировать Шаббат"  subtitle="Ужины рядом" />
          <ListRow href="/dashboard/ai-rabbi/parsha"        Icon={BookOpenText} title="Парша недели"       subtitle="5-минутная мудрость" />
          <ListRow href="/dashboard/ai-rabbi/meet-people"   Icon={Users}      title="Найти своих"          subtitle="Знакомства и встречи" />
        </ListSection>
      </Reveal>

      {/* ── 4. Community + Inspire row ───────────────────────────────── */}
      {myCommunity && (
        <Reveal delay={0.18}>
          <ListSection label="Активность">
            <ListRow
              href="/dashboard/community"
              Icon={Building2}
              tone="primary"
              title={myCommunity.name}
              subtitle={[myCommunity.city, `${membersCount} ${membersCount === 1 ? 'участник' : 'участников'}`].filter(Boolean).join(' · ')}
              meta={isStaff && (
                <Badge variant="secondary" className="text-[10px] uppercase">{myRole}</Badge>
              )}
            />
            <ListRow
              href="/dashboard/inspire"
              Icon={BookHeart}
              title="Inspire"
              subtitle="Праздники, мудрости, истории"
            />
            <ListRow
              href="/dashboard/connect"
              Icon={Users}
              title="Группы по интересам"
              subtitle="Учёба, мамы, кулинария…"
            />
          </ListSection>
        </Reveal>
      )}

      {/* ── 5. Личное ────────────────────────────────────────────────── */}
      <Reveal delay={0.22}>
        <ListSection label="Личное">
          <ListRow
            href="/dashboard/me/jewish-id"
            Icon={ScanLine}
            tone="primary"
            title="Jewish ID"
            subtitle="Цифровой паспорт с QR"
          />
          <ListRow
            href="/dashboard/routines"
            Icon={BookHeart}
            title="Мои рутины"
            subtitle="Молитвы и стрик"
          />
          <ListRow
            href="/dashboard/requests"
            Icon={HandHeart}
            title="Просьбы общины"
            meta={requestsCount > 0 ? (
              <Badge variant="default" className="h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                {requestsCount}
              </Badge>
            ) : undefined}
          />
          <ListRow
            href="/dashboard/notifications"
            Icon={Bell}
            title="Уведомления"
          />
          <ListRow
            href="/dashboard/me"
            Icon={Users}
            title="Мой профиль"
            subtitle={profile?.hebrew_name ?? undefined}
          />
        </ListSection>
      </Reveal>

      {/* ── 6. Управление (rabbi/admin) ─────────────────────────────── */}
      {isStaff && (
        <Reveal delay={0.26}>
          <ListSection
            label="Управление"
            footnote="Только для раввинов и админов общины."
          >
            <ListRow
              href="/dashboard/assistant"
              Icon={Bot}
              tone="primary"
              title="AI Ассистент"
              subtitle="Голосовой CRM"
              meta={openTasksCount > 0 ? (
                <Badge variant="secondary" className="text-[10px]">{openTasksCount} задач</Badge>
              ) : undefined}
            />
            <ListRow
              href="/dashboard/community/pending"
              Icon={ShieldCheck}
              title="Модерация мест"
              meta={pendingPlacesCount > 0 ? (
                <Badge variant="default" className="h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                  {pendingPlacesCount}
                </Badge>
              ) : undefined}
            />
            <ListRow
              href="/dashboard/members"
              Icon={Users}
              title="Заявки на вступление"
              meta={pendingJoinCount > 0 ? (
                <Badge variant="default" className="h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                  {pendingJoinCount}
                </Badge>
              ) : undefined}
            />
            <ListRow
              href="/dashboard/invitations"
              Icon={MailPlus}
              title="Приглашения"
            />
            <ListRow
              href="/dashboard/community/manage"
              Icon={Building2}
              title="Управление общиной"
              subtitle="Места и программы"
            />
          </ListSection>
        </Reveal>
      )}

      {/* ── 7. Footer hint ──────────────────────────────────────────── */}
      {data.pending_membership.aggregate?.count ? (
        <Reveal delay={0.3}>
          <div className="text-center text-xs text-muted-foreground px-1 pt-2">
            У тебя {data.pending_membership.aggregate.count} ожидающих заявок на вступление в другие общины
          </div>
        </Reveal>
      ) : null}
    </div>
  );
}
