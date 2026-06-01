// Пульт раввина — unified admin hub for the active community.
// Aggregates everything scattered across the drawer: pending approvals, place
// moderation, content creation, community profile, invitations, AI assistant —
// with live counts + quick actions. Rabbi/admin only.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  UserPlus, ShieldCheck, Users, CalendarDays, CalendarPlus, MapPinPlus,
  BookPlus, MailPlus, Settings2, Bot, ChevronRight, type LucideIcon,
} from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';

const FETCH = /* GraphQL */ `
  query AdminOverview($cid: uuid!) {
    pending_members: memberships_aggregate(
      where: { community_id: { _eq: $cid }, status: { _eq: pending } }
    ) { aggregate { count } }
    active_members: memberships_aggregate(
      where: { community_id: { _eq: $cid }, status: { _eq: active } }
    ) { aggregate { count } }
    pending_places: places_aggregate(
      where: { community_id: { _eq: $cid }, submission_status: { _eq: pending } }
    ) { aggregate { count } }
    upcoming_events: events_aggregate(
      where: { community_id: { _eq: $cid }, starts_at: { _gte: "now()" } }
    ) { aggregate { count } }
    communities_by_pk(id: $cid) { id name }
  }
`;

interface Resp {
  pending_members: { aggregate: { count: number } | null };
  active_members: { aggregate: { count: number } | null };
  pending_places: { aggregate: { count: number } | null };
  upcoming_events: { aggregate: { count: number } | null };
  communities_by_pk: { id: string; name: string } | null;
}

export default async function RabbiConsolePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const role = session.hasura.default_role;
  if (role !== 'rabbi' && role !== 'admin') redirect('/dashboard');

  const cid = session.hasura.community_id;
  if (!cid || cid === '00000000-0000-0000-0000-000000000000') redirect('/dashboard/community/discover');

  const d = await hasuraAdmin.request<Resp>(FETCH, { cid });
  const pendingMembers = d.pending_members.aggregate?.count ?? 0;
  const pendingPlaces = d.pending_places.aggregate?.count ?? 0;
  const activeMembers = d.active_members.aggregate?.count ?? 0;
  const upcomingEvents = d.upcoming_events.aggregate?.count ?? 0;
  const needsAttention = pendingMembers + pendingPlaces;

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-28 space-y-6">
      <Reveal>
        <header className="px-0.5">
          <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
            Пульт раввина
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {d.communities_by_pk?.name ?? 'Управление общиной'}
          </p>
        </header>
      </Reveal>

      {/* Needs attention */}
      <Reveal delay={0.04}>
        <section className="space-y-2.5">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium px-0.5">
            Требует внимания
          </h2>
          <AttentionRow
            Icon={UserPlus} label="Заявки на вступление"
            sub={pendingMembers > 0 ? 'Ждут одобрения' : 'Новых заявок нет'}
            count={pendingMembers} href="/dashboard/members"
          />
          <AttentionRow
            Icon={ShieldCheck} label="Места на модерации"
            sub={pendingPlaces > 0 ? 'Ждут проверки' : 'Очередь пуста'}
            count={pendingPlaces} href="/dashboard/community/pending"
          />
          {needsAttention === 0 && (
            <p className="text-xs text-muted-foreground px-1 pt-1">Всё разобрано — отличная работа. 🎉</p>
          )}
        </section>
      </Reveal>

      {/* Overview stats */}
      <Reveal delay={0.06}>
        <section className="grid grid-cols-2 gap-2.5">
          <StatCard Icon={Users} value={activeMembers} label="участников" href="/dashboard/members" />
          <StatCard Icon={CalendarDays} value={upcomingEvents} label="предстоящих событий" href="/dashboard/events" />
        </section>
      </Reveal>

      {/* Quick actions */}
      <Reveal delay={0.08}>
        <section>
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium px-0.5 mb-2.5">
            Быстрые действия
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            <Action Icon={CalendarPlus} label="Создать событие" href="/dashboard/events/new" />
            <Action Icon={MapPinPlus} label="Добавить место" href="/dashboard/community/places/new" />
            <Action Icon={BookPlus} label="Создать программу" href="/dashboard/community/programs/new" />
            <Action Icon={MailPlus} label="Пригласить" href="/dashboard/invitations/new" />
            <Action Icon={Settings2} label="Профиль общины" href="/dashboard/community/manage/edit" />
            <Action Icon={Users} label="Все участники" href="/dashboard/members" />
          </div>
        </section>
      </Reveal>

      {/* AI assistant */}
      <Reveal delay={0.1}>
        <Link
          href="/dashboard/assistant"
          className="group block relative overflow-hidden rounded-[20px] p-4 bg-foreground text-background"
        >
          <div aria-hidden className="absolute -top-12 -end-12 w-40 h-40 rounded-full opacity-50 pointer-events-none"
            style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }} />
          <div className="relative flex items-center gap-3">
            <div className="shrink-0 w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center">
              <Bot size={18} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-serif text-[15px] font-semibold leading-tight">AI-ассистент раввина</div>
              <p className="text-[12px] text-background/75 leading-snug mt-0.5">
                Спроси про общину: дни рождения, активность, задачи, кто давно не заходил.
              </p>
            </div>
            <ChevronRight size={16} className="text-primary rtl:-scale-x-100" />
          </div>
        </Link>
      </Reveal>
    </div>
  );
}

function AttentionRow({ Icon, label, sub, count, href }: {
  Icon: LucideIcon; label: string; sub: string; count: number; href: string;
}) {
  const active = count > 0;
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
        active
          ? 'bg-primary/8 border-primary/30 hover:border-primary/50'
          : 'bg-card border-border/70 hover:border-border'
      }`}
    >
      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
        active ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground/60'
      }`}>
        <Icon size={17} strokeWidth={1.9} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-tight">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      </div>
      {active && (
        <span className="shrink-0 min-w-6 h-6 px-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
          {count}
        </span>
      )}
      <ChevronRight size={15} className="shrink-0 text-muted-foreground/50 rtl:-scale-x-100" />
    </Link>
  );
}

function StatCard({ Icon, value, label, href }: {
  Icon: LucideIcon; value: number; label: string; href: string;
}) {
  return (
    <Link href={href} className="rounded-2xl bg-card ring-1 ring-border/70 p-4 hover:ring-primary/30 transition-all">
      <Icon size={18} strokeWidth={1.9} className="text-primary mb-2" />
      <div className="font-serif text-2xl font-semibold leading-none">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </Link>
  );
}

function Action({ Icon, label, href }: { Icon: LucideIcon; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 rounded-2xl bg-card ring-1 ring-border/70 px-3.5 py-3 hover:ring-primary/30 transition-all"
    >
      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/12 text-primary flex items-center justify-center">
        <Icon size={15} strokeWidth={2} />
      </div>
      <span className="text-sm font-medium leading-tight">{label}</span>
    </Link>
  );
}
