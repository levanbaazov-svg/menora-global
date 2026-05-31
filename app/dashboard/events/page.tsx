// Events list — compact cards with cover thumbnail, date, RSVP state.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, MapPin, Users, ChevronRight, CalendarDays } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { EVENT_TYPE_LABELS } from '@/lib/events/schema';

const LIST_EVENTS = /* GraphQL */ `
  query ListEvents($community_id: uuid!) {
    events(
      where: { community_id: { _eq: $community_id } }
      order_by: { starts_at: asc }
    ) {
      id title type status starts_at timezone location_text cover_image_url
      attendee_count_cached max_attendees is_free price_amount price_currency
      host { id name }
      rsvps { user_id status }
    }
  }
`;

interface EventRow {
  id: string; title: string; type: string; status: string;
  starts_at: string; timezone: string | null; location_text: string | null;
  cover_image_url: string | null;
  attendee_count_cached: number; max_attendees: number | null;
  is_free: boolean; price_amount: number | null; price_currency: string | null;
  host: { id: string; name: string | null } | null;
  rsvps: Array<{ user_id: string; status: string }>;
}

const RSVP_LABEL: Record<string, string> = { yes: 'Иду', maybe: 'Возможно', no: 'Не иду' };

export default async function EventsListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { events } = await client.request<{ events: EventRow[] }>(
    LIST_EVENTS, { community_id: session.hasura.community_id },
  );

  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now);
  const past = events.filter((e) => new Date(e.starts_at).getTime() < now);

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-8">
      <header className="flex items-start justify-between gap-3 mb-4 px-0.5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
            События
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {upcoming.length} предстоящих
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-foreground text-background px-3.5 h-9 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus size={15} strokeWidth={2.4} /> Создать
        </Link>
      </header>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          <CalendarDays size={28} strokeWidth={1.5} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Пока нет событий в общине.</p>
          <Link href="/dashboard/events/new" className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold">
            Создать первое
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <section className="space-y-2.5">
              {upcoming.map((e, i) => (
                <Reveal key={e.id} delay={0.03 * i}>
                  <EventCard e={e} userId={session.user.id} />
                </Reveal>
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2 px-0.5">
                Прошедшие
              </h2>
              <div className="space-y-2.5 opacity-60">
                {past.map((e) => <EventCard key={e.id} e={e} userId={session.user.id} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({ e, userId }: { e: EventRow; userId: string }) {
  const myRsvp = e.rsvps.find((r) => r.user_id === userId)?.status;
  const isHost = e.host?.id === userId;
  const when = new Date(e.starts_at).toLocaleString('ru-RU', {
    timeZone: e.timezone ?? undefined,
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  const price = e.is_free || !e.price_amount ? null : `${e.price_amount} ${e.price_currency ?? ''}`;

  return (
    <Link
      href={`/dashboard/events/${e.id}`}
      className="group flex gap-3 rounded-2xl bg-card ring-1 ring-border/70 p-2.5 hover:ring-primary/30 hover:shadow-[0_6px_18px_-6px_rgba(20,24,31,0.12)] transition-all"
    >
      {/* Thumbnail */}
      <div className="shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden">
        {e.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.cover_image_url} alt={e.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/25 to-foreground/30 flex items-center justify-center">
            <CalendarDays size={22} className="text-white/80" strokeWidth={1.6} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start gap-2">
          <h3 className="font-medium text-sm leading-tight line-clamp-2 flex-1">{e.title}</h3>
          {myRsvp === 'yes' && (
            <span className="shrink-0 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-semibold">Иду</span>
          )}
          {isHost && (
            <span className="shrink-0 rounded-full bg-foreground text-background px-2 py-0.5 text-[10px] font-semibold">Хост</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1 capitalize">{when}</div>
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-1">
          {e.location_text && (
            <span className="inline-flex items-center gap-0.5 truncate max-w-[140px]">
              <MapPin size={11} strokeWidth={2} /> {e.location_text}
            </span>
          )}
          <span className="inline-flex items-center gap-0.5">
            <Users size={11} strokeWidth={2} />
            {e.attendee_count_cached}{e.max_attendees ? `/${e.max_attendees}` : ''}
          </span>
          {price && <span className="text-foreground/70 font-medium">{price}</span>}
        </div>
      </div>

      <ChevronRight size={16} className="shrink-0 self-center text-muted-foreground/40" />
    </Link>
  );
}
