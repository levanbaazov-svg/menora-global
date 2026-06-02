// Events list — poster-style cards (cover image hero + title overlay + meta).

import { auth } from '@/lib/auth';
import { MotifFallback } from '@/app/_components/ui/MotifFallback';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';
import { Plus, MapPin, Users, CalendarDays } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { LOCALE_BCP47, type Locale } from '@/i18n/config';

type T = Awaited<ReturnType<typeof getTranslations<'events'>>>;

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

export default async function EventsListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { events } = await client.request<{ events: EventRow[] }>(
    LIST_EVENTS, { community_id: session.hasura.community_id },
  );
  const t = await getTranslations('events');
  const locale = (await getLocale()) as Locale;

  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now);
  const past = events.filter((e) => new Date(e.starts_at).getTime() < now);

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-8">
      <header className="flex items-start justify-between gap-3 mb-4 px-0.5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('upcoming', { count: upcoming.length })}
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold shadow-[var(--shadow-gold)] hover:opacity-95 active:scale-95 transition-all"
        >
          <Plus size={15} strokeWidth={2.4} /> {t('create')}
        </Link>
      </header>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          <CalendarDays size={28} strokeWidth={1.5} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">{t('empty')}</p>
          <Link href="/dashboard/events/new" className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold">
            {t('createFirst')}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section className="space-y-3">
              {upcoming.map((e, i) => (
                <Reveal key={e.id} delay={0.03 * i}>
                  <EventCard e={e} userId={session.user.id} t={t} locale={locale} />
                </Reveal>
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2 px-0.5">
                {t('past')}
              </h2>
              <div className="space-y-3 opacity-70">
                {past.map((e) => <EventCard key={e.id} e={e} userId={session.user.id} t={t} locale={locale} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({ e, userId, t, locale }: { e: EventRow; userId: string; t: T; locale: Locale }) {
  const myRsvp = e.rsvps.find((r) => r.user_id === userId)?.status;
  const isHost = e.host?.id === userId;
  const when = new Date(e.starts_at).toLocaleString(LOCALE_BCP47[locale], {
    timeZone: e.timezone || undefined,
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  const price = e.is_free || !e.price_amount ? null : `${e.price_amount} ${e.price_currency ?? ''}`;

  return (
    <Link
      href={`/dashboard/events/${e.id}`}
      className="group block overflow-hidden rounded-2xl bg-card ring-1 ring-border/70 hover:ring-primary/30 hover:shadow-[0_10px_28px_-8px_rgba(20,24,31,0.16)] transition-all"
    >
      {/* Poster */}
      <div className="relative h-44 overflow-hidden">
        {e.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={e.cover_image_url}
            alt={e.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <MotifFallback variant="event" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <div className="absolute top-3 right-3 flex gap-1.5">
          {myRsvp === 'yes' && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm">{t('going')}</span>
          )}
          {isHost && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-sm">{t('host')}</span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <h3 className="font-serif text-lg font-semibold leading-tight drop-shadow-sm line-clamp-2">
            {e.title}
          </h3>
          <div className="mt-1 text-xs text-white/90 capitalize">{when}</div>
        </div>
      </div>

      {/* Meta strip */}
      <div className="flex items-center gap-3 px-4 py-2.5 text-[11px] text-muted-foreground">
        {e.location_text && (
          <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
            <MapPin size={12} strokeWidth={2} /> {e.location_text}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Users size={12} strokeWidth={2} />
          {e.attendee_count_cached}{e.max_attendees ? `/${e.max_attendees}` : ''}
        </span>
        <span className="ms-auto font-medium text-foreground/70">
          {price ?? t('free')}
        </span>
      </div>
    </Link>
  );
}
