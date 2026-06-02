// Пульт раввина — unified admin hub for the active community.
// Aggregates everything scattered across the drawer: pending approvals, place
// moderation, content creation, community profile, invitations, AI assistant —
// with live counts + quick actions. Rabbi/admin only.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import {
  UserPlus, ShieldCheck, Users, CalendarDays, CalendarPlus, MapPinPlus,
  BookPlus, MailPlus, Settings2, Bot, ChevronRight, type LucideIcon,
} from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { QuickApprove } from './QuickApprove';

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
    pending_member_list: memberships(
      where: { community_id: { _eq: $cid }, status: { _eq: pending } }
      order_by: { created_at: asc } limit: 3
    ) { id user { name } }
    pending_place_list: places(
      where: { community_id: { _eq: $cid }, submission_status: { _eq: pending }, archived_at: { _is_null: true } }
      order_by: { created_at: asc } limit: 3
    ) { id name }
    communities_by_pk(id: $cid) { id name }
  }
`;

interface Resp {
  pending_members: { aggregate: { count: number } | null };
  active_members: { aggregate: { count: number } | null };
  pending_places: { aggregate: { count: number } | null };
  upcoming_events: { aggregate: { count: number } | null };
  pending_member_list: Array<{ id: string; user: { name: string | null } | null }>;
  pending_place_list: Array<{ id: string; name: string }>;
  communities_by_pk: { id: string; name: string } | null;
}

export default async function RabbiConsolePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const role = session.hasura.default_role;
  if (role !== 'rabbi' && role !== 'admin') redirect('/dashboard');

  const cid = session.hasura.community_id;
  if (!cid || cid === '00000000-0000-0000-0000-000000000000') redirect('/dashboard/community/discover');

  const t = await getTranslations('admin');
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
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {d.communities_by_pk?.name ?? t('subtitle')}
          </p>
        </header>
      </Reveal>

      {/* Needs attention */}
      <Reveal delay={0.04}>
        <section className="space-y-2.5">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium px-0.5">
            {t('needsAttention')}
          </h2>
          <AttentionRow
            Icon={UserPlus} label={t('attention.members')}
            sub={pendingMembers > 0 ? t('attention.membersWaiting') : t('attention.membersClear')}
            count={pendingMembers} href="/dashboard/members"
          />
          {/* Inline one-click approvals for the first few pending members */}
          {d.pending_member_list.map((m) => (
            <QuickApprove key={m.id} kind="member" id={m.id} label={m.user?.name ?? '—'} />
          ))}

          <AttentionRow
            Icon={ShieldCheck} label={t('attention.places')}
            sub={pendingPlaces > 0 ? t('attention.placesWaiting') : t('attention.placesClear')}
            count={pendingPlaces} href="/dashboard/community/pending"
          />
          {d.pending_place_list.map((p) => (
            <QuickApprove key={p.id} kind="place" id={p.id} label={p.name} />
          ))}

          {needsAttention === 0 && (
            <p className="text-xs text-muted-foreground px-1 pt-1">{t('allDone')}</p>
          )}
        </section>
      </Reveal>

      {/* Overview stats */}
      <Reveal delay={0.06}>
        <section className="grid grid-cols-2 gap-2.5">
          <StatCard Icon={Users} value={activeMembers} label={t('stats.members')} href="/dashboard/members" />
          <StatCard Icon={CalendarDays} value={upcomingEvents} label={t('stats.events')} href="/dashboard/events" />
        </section>
      </Reveal>

      {/* Quick actions */}
      <Reveal delay={0.08}>
        <section>
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium px-0.5 mb-2.5">
            {t('actionsTitle')}
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            <Action Icon={CalendarPlus} label={t('actions.createEvent')} href="/dashboard/events/new" />
            <Action Icon={MapPinPlus} label={t('actions.addPlace')} href="/dashboard/community/places/new" />
            <Action Icon={BookPlus} label={t('actions.addProgram')} href="/dashboard/community/programs/new" />
            <Action Icon={MailPlus} label={t('actions.invite')} href="/dashboard/invitations/new" />
            <Action Icon={Settings2} label={t('actions.communityProfile')} href="/dashboard/community/manage/edit" />
            <Action Icon={Users} label={t('actions.allMembers')} href="/dashboard/members" />
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
              <div className="font-serif text-[15px] font-semibold leading-tight">{t('assistant.title')}</div>
              <p className="text-[12px] text-background/75 leading-snug mt-0.5">
                {t('assistant.desc')}
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
