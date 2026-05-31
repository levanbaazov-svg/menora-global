// Event detail — hero, quick facts, host, description, attendees, sticky RSVP.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarClock, MapPin, Wallet, Users, ChevronLeft, Navigation,
} from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { Avatar } from '@/app/dashboard/_Avatar';
import { RsvpBar } from './RsvpBar';
import { HostBar } from './HostBar';

const EVENT_TYPE_LABELS: Record<string, string> = {
  shabbat_dinner: 'Шаббатний ужин', shabbat_lunch: 'Шаббатний обед',
  holiday_meal: 'Праздничная трапеза', lecture: 'Лекция / шиур',
  minyan: 'Миньян', learning: 'Учёба', social: 'Социальное',
  volunteer: 'Волонтёрство', kids: 'Для детей', other: 'Другое',
};

const FETCH = /* GraphQL */ `
  query EventDetail($id: uuid!, $user_id: uuid!) {
    events_by_pk(id: $id) {
      id title description type starts_at ends_at timezone
      location_text location_address all_day
      max_attendees attendee_count_cached cover_image_url
      is_free price_amount price_currency status
      community { id name }
      host { id name image_url }
    }
    going: rsvps(
      where: { event_id: { _eq: $id }, status: { _eq: yes } }
      order_by: { created_at: asc } limit: 30
    ) {
      plus_ones
      user { id name image_url }
    }
    my_rsvp: rsvps(
      where: { event_id: { _eq: $id }, user_id: { _eq: $user_id } } limit: 1
    ) { status }
  }
`;

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const { id } = await params;

  const data = await hasuraAdmin.request<{
    events_by_pk: {
      id: string; title: string; description: string | null; type: string;
      starts_at: string; ends_at: string | null; timezone: string; all_day: boolean;
      location_text: string | null; location_address: string | null;
      max_attendees: number | null; attendee_count_cached: number; cover_image_url: string | null;
      is_free: boolean; price_amount: number | null; price_currency: string | null; status: string;
      community: { id: string; name: string } | null;
      host: { id: string; name: string | null; image_url: string | null } | null;
    } | null;
    going: Array<{ plus_ones: number; user: { id: string; name: string | null; image_url: string | null } | null }>;
    my_rsvp: Array<{ status: string }>;
  }>(FETCH, { id, user_id: session.user.id });

  const e = data.events_by_pk;
  if (!e) notFound();

  const myStatus = data.my_rsvp[0]?.status ?? null;
  const isHost = e.host?.id === session.user.id;
  const typeLabel = EVENT_TYPE_LABELS[e.type] ?? e.type;

  const tz = e.timezone || undefined;
  const start = new Date(e.starts_at);
  const dateStr = start.toLocaleDateString('ru-RU', {
    timeZone: tz, weekday: 'long', day: 'numeric', month: 'long',
  });
  const timeStr = e.all_day
    ? 'Весь день'
    : start.toLocaleTimeString('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
      + (e.ends_at ? `–${new Date(e.ends_at).toLocaleTimeString('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' })}` : '');

  const priceStr = e.is_free || e.price_amount == null || e.price_amount === 0
    ? 'Бесплатно'
    : `${e.price_amount} ${e.price_currency ?? ''}`;

  const goingCount = e.attendee_count_cached;

  return (
    <div className="container mx-auto max-w-xl px-0 md:px-6 pt-0 md:pt-3 pb-36">
      {/* Hero */}
      <Reveal>
        <section className="relative">
          <div className="relative h-56 md:h-64 md:rounded-2xl overflow-hidden">
            {e.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.cover_image_url} alt={e.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/35 to-foreground/45" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/5" />
            <Link
              href="/dashboard/events"
              className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/85 backdrop-blur px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-white transition-colors"
            >
              <ChevronLeft size={14} /> События
            </Link>
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <span className="inline-block rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-foreground mb-2">
                {typeLabel}
              </span>
              <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight drop-shadow-sm">
                {e.title}
              </h1>
              {e.community && <div className="text-xs text-white/85 mt-1">{e.community.name}</div>}
            </div>
          </div>
        </section>
      </Reveal>

      <div className="px-4 md:px-0 space-y-6 mt-5">
        {e.status === 'cancelled' && (
          <div className="rounded-2xl bg-destructive/10 text-destructive px-4 py-3 text-sm font-medium">
            Событие отменено
          </div>
        )}

        <Reveal delay={0.04}>
          <div className="grid grid-cols-2 gap-3">
            <Fact Icon={CalendarClock} label="Когда" value={dateStr} sub={timeStr} />
            <Fact Icon={Wallet} label="Стоимость" value={priceStr} />
            {(e.location_text || e.location_address) && (
              <Fact Icon={MapPin} label="Где" value={e.location_text ?? e.location_address ?? '—'} />
            )}
            <Fact Icon={Users} label="Идут" value={`${goingCount}${e.max_attendees ? ` / ${e.max_attendees}` : ''}`} />
          </div>
        </Reveal>

        {e.location_address && (
          <Reveal delay={0.05}>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(e.location_address)}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
            >
              <Navigation size={15} /> Построить маршрут
            </a>
          </Reveal>
        )}

        {e.host && (
          <Reveal delay={0.06}>
            <Link
              href={`/dashboard/people/${e.host.id}`}
              className="flex items-center gap-3 rounded-2xl bg-card ring-1 ring-border/70 p-4 hover:ring-primary/30 transition-all"
            >
              <Avatar user={{ id: e.host.id, name: e.host.name, email: null, image_url: e.host.image_url }} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Хост</div>
                <div className="text-sm font-medium leading-tight">{e.host.name ?? 'Без имени'}</div>
              </div>
              {isHost && <span className="text-[11px] text-primary font-medium">Это вы</span>}
            </Link>
          </Reveal>
        )}

        {e.description && (
          <Reveal delay={0.08}>
            <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">{e.description}</p>
          </Reveal>
        )}

        {data.going.length > 0 && (
          <Reveal delay={0.1}>
            <section>
              <h2 className="font-serif text-lg font-semibold leading-tight mb-3">
                Кто идёт <span className="text-sm font-normal text-muted-foreground">· {goingCount}</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.going.map((r) => (
                  <Link key={r.user?.id} href={`/dashboard/people/${r.user?.id}`} title={r.user?.name ?? ''}>
                    <Avatar user={{ id: r.user?.id ?? '', name: r.user?.name ?? null, email: null, image_url: r.user?.image_url ?? null }} size="md" />
                  </Link>
                ))}
              </div>
            </section>
          </Reveal>
        )}
      </div>

      {/* Sticky RSVP / host bar */}
      {e.status !== 'cancelled' && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-24 md:pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
          <div className="container mx-auto max-w-xl">
            {isHost ? <HostBar eventId={e.id} /> : <RsvpBar eventId={e.id} current={myStatus} />}
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({ Icon, label, value, sub }: { Icon: typeof MapPin; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-border/70 p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        <Icon size={13} strokeWidth={2} /> {label}
      </div>
      <div className="text-sm font-medium leading-snug capitalize">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">{sub}</div>}
    </div>
  );
}
