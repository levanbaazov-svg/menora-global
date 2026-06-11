// Events list — вертикальные постер-карточки в 2 колонки (по мокапу):
// фото на всю карточку, дата-чип, цветной бейдж типа, аватары идущих.

import { auth } from '@/lib/auth';
import { MotifFallback } from '@/app/_components/ui/MotifFallback';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';
import { Plus, CalendarDays } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { initials } from '@/lib/profile/display';
import { LOCALE_BCP47, type Locale } from '@/i18n/config';

type T = Awaited<ReturnType<typeof getTranslations<'events'>>>;
type TPage = Awaited<ReturnType<typeof getTranslations<'eventsPage'>>>;

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
      yes_rsvps: rsvps(where: { status: { _eq: yes } }, limit: 3) {
        user { id name image_url }
      }
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
  yes_rsvps: Array<{ user: { id: string; name: string | null; image_url: string | null } | null }>;
}

// Пастельные бейджи по типу события (как цветные ярлыки на мокапе)
const TYPE_BADGE: Record<string, string> = {
  shabbat_dinner: 'bg-violet-100 text-violet-700',
  shabbat_lunch:  'bg-violet-100 text-violet-700',
  holiday_meal:   'bg-amber-100 text-amber-700',
  lecture:        'bg-sky-100 text-sky-700',
  minyan:         'bg-emerald-100 text-emerald-700',
  learning:       'bg-teal-100 text-teal-700',
  social:         'bg-pink-100 text-pink-700',
  volunteer:      'bg-orange-100 text-orange-700',
  kids:           'bg-yellow-100 text-yellow-700',
};

export default async function EventsListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { events } = await client.request<{ events: EventRow[] }>(
    LIST_EVENTS, { community_id: session.hasura.community_id },
  );
  const t = await getTranslations('events');
  const tp = await getTranslations('eventsPage');
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
        <div className="space-y-7">
          {upcoming.length > 0 && (
            <section className="grid grid-cols-2 gap-3">
              {upcoming.map((e, i) => (
                <Reveal key={e.id} delay={0.03 * i}>
                  <EventCard e={e} userId={session.user.id} t={t} tp={tp} locale={locale} />
                </Reveal>
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2 px-0.5">
                {t('past')}
              </h2>
              <div className="grid grid-cols-2 gap-3 opacity-65">
                {past.map((e) => (
                  <EventCard key={e.id} e={e} userId={session.user.id} t={t} tp={tp} locale={locale} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({ e, userId, t, tp, locale }: {
  e: EventRow; userId: string; t: T; tp: TPage; locale: Locale;
}) {
  const myRsvp = e.rsvps.find((r) => r.user_id === userId)?.status;
  const isHost = e.host?.id === userId;
  const starts = new Date(e.starts_at);
  const tz = e.timezone || undefined;
  const weekday = starts.toLocaleDateString(LOCALE_BCP47[locale], { timeZone: tz, weekday: 'short' });
  const day = starts.toLocaleDateString(LOCALE_BCP47[locale], { timeZone: tz, day: 'numeric' });
  const time = starts.toLocaleTimeString(LOCALE_BCP47[locale], { timeZone: tz, hour: '2-digit', minute: '2-digit' });
  const price = e.is_free || !e.price_amount ? null : `${e.price_amount} ${e.price_currency === 'UAH' ? '₴' : e.price_currency ?? ''}`;
  const going = e.yes_rsvps.map((r) => r.user).filter(Boolean) as Array<{ id: string; name: string | null; image_url: string | null }>;
  const badge = TYPE_BADGE[e.type];

  return (
    <Link
      href={`/dashboard/events/${e.id}`}
      className="group relative block aspect-[3/4] overflow-hidden rounded-2xl ring-1 ring-border/60 hover:ring-primary/40 hover:shadow-[0_12px_30px_-8px_rgba(20,24,31,0.22)] transition-all"
    >
      {/* Фото на всю карточку */}
      <div className="absolute inset-0">
        {e.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={e.cover_image_url}
            alt={e.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <MotifFallback variant="event" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/5" />
      </div>

      {/* Дата-чип */}
      <div className="absolute top-2.5 left-2.5 rounded-xl bg-white/95 px-2.5 py-1.5 text-center shadow-sm min-w-11">
        <div className="text-[8px] uppercase tracking-[0.12em] font-semibold text-foreground/55 leading-none">
          {weekday.replace('.', '')}
        </div>
        <div className="font-serif text-[16px] font-bold leading-tight text-foreground">{day}</div>
      </div>

      {/* Бейджи справа: тип + статусы */}
      <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5">
        {badge && (
          <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide shadow-sm ${badge}`}>
            {tp(`type.${e.type}`)}
          </span>
        )}
        {myRsvp === 'yes' && (
          <span className="rounded-full bg-primary px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
            {t('going')}
          </span>
        )}
        {isHost && (
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-foreground shadow-sm">
            {t('host')}
          </span>
        )}
      </div>

      {/* Низ: заголовок + время/место + идущие */}
      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
        <h3 className="font-serif text-[15px] font-semibold leading-snug drop-shadow-sm line-clamp-2">
          {e.title}
        </h3>
        <div className="mt-0.5 text-[10.5px] text-white/85 truncate">
          {time}{e.location_text ? ` · ${e.location_text}` : ''}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {going.length > 0 ? (
            <>
              <div className="flex -space-x-1.5">
                {going.map((u) => (
                  u.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={u.id}
                      src={u.image_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover ring-2 ring-black/40"
                    />
                  ) : (
                    <span
                      key={u.id}
                      className="w-5 h-5 rounded-full bg-(--color-gold-soft) text-(--color-deep) ring-2 ring-black/40 flex items-center justify-center text-[8px] font-bold"
                    >
                      {initials({ id: u.id, name: u.name, email: null, image_url: null })}
                    </span>
                  )
                ))}
              </div>
              <span className="text-[11px] font-medium text-white/90">
                {t('goingCount', { count: e.attendee_count_cached })}
              </span>
            </>
          ) : (
            <span className="text-[11px] font-medium text-white/75">{t('beFirst')}</span>
          )}
          {price && (
            <span className="ms-auto rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-foreground">
              {price}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
