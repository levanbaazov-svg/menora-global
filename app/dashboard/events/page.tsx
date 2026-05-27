import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { EVENT_TYPE_LABELS } from '@/lib/events/schema';
import { hebrewDate } from '@/lib/hebcal';

const LIST_EVENTS = /* GraphQL */ `
  query ListEvents($community_id: uuid!) {
    events(
      where: { community_id: { _eq: $community_id } }
      order_by: { starts_at: asc }
    ) {
      id title type status starts_at location_text
      attendee_count_cached max_attendees
      host { id name }
      rsvps { user_id status }
    }
  }
`;

interface EventRow {
  id: string; title: string; type: string; status: string;
  starts_at: string; location_text: string | null;
  attendee_count_cached: number; max_attendees: number | null;
  host: { id: string; name: string | null } | null;
  rsvps: Array<{ user_id: string; status: string }>;
}

const RSVP_BADGES: Record<string, { text: string; cls: string }> = {
  yes:      { text: '✓ Иду',       cls: 'bg-green-100 text-green-800' },
  maybe:    { text: '? Возможно',  cls: 'bg-yellow-100 text-yellow-800' },
  no:       { text: '✗ Не смогу',  cls: 'bg-gray-100 text-gray-700' },
  waitlist: { text: 'Лист ожидания', cls: 'bg-blue-100 text-blue-800' },
};

const STATUS_BADGES: Record<string, { text: string; cls: string }> = {
  draft:     { text: 'Черновик', cls: 'bg-gray-100 text-gray-600' },
  published: { text: 'Опубликовано', cls: 'bg-(--color-gold-soft) text-(--color-gold-dark)' },
  cancelled: { text: 'Отменено', cls: 'bg-red-100 text-red-700' },
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function EventsListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { events } = await client.request<{ events: EventRow[] }>(
    LIST_EVENTS,
    { community_id: session.hasura.community_id },
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold mb-1">События</h1>
          <p className="text-sm text-(--color-muted)">{events.length} {events.length === 1 ? 'событие' : 'событий'}</p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="px-5 py-2.5 rounded-full bg-(--color-deep) text-white text-sm font-semibold hover:opacity-90"
        >
          + Создать
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <p className="text-(--color-muted) mb-4">Пока нет событий в общине.</p>
          <Link
            href="/dashboard/events/new"
            className="px-5 py-2.5 rounded-full bg-(--color-gold) text-(--color-deep) text-sm font-semibold hover:scale-105 inline-block transition-transform"
          >
            Создать первое
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => {
            const myRsvp = e.rsvps[0]?.status;
            const isHost = e.host?.id === session.user.id;
            return (
              <Link
                key={e.id}
                href={`/dashboard/events/${e.id}`}
                className="block border rounded-xl p-5 hover:border-(--color-gold) transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-lg">{e.title}</h2>
                    <p className="text-sm text-(--color-muted) mt-0.5">
                      {EVENT_TYPE_LABELS[e.type as keyof typeof EVENT_TYPE_LABELS] ?? e.type} · {formatWhen(e.starts_at)}
                      {e.location_text && ` · ${e.location_text}`}
                    </p>
                    <p className="text-xs text-(--color-muted) mt-0.5 font-serif">
                      {hebrewDate(new Date(e.starts_at), 'ru')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {e.status !== 'published' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGES[e.status]?.cls}`}>
                        {STATUS_BADGES[e.status]?.text ?? e.status}
                      </span>
                    )}
                    {myRsvp && RSVP_BADGES[myRsvp] && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${RSVP_BADGES[myRsvp].cls}`}>
                        {RSVP_BADGES[myRsvp].text}
                      </span>
                    )}
                    {isHost && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-(--color-deep) text-white">
                        Я хост
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-(--color-muted) mt-2">
                  <span>👥 {e.attendee_count_cached}{e.max_attendees ? ` / ${e.max_attendees}` : ''}</span>
                  {e.host?.name && <span>· Хост: {e.host.name}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
