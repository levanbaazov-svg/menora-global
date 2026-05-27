import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { EVENT_TYPE_LABELS } from '@/lib/events/schema';
import { hebrewDate } from '@/lib/hebcal';
import { RsvpButtons } from './RsvpButtons';

const FETCH_EVENT = /* GraphQL */ `
  query FetchEvent($id: uuid!) {
    events_by_pk(id: $id) {
      id title description type status visibility
      starts_at ends_at timezone all_day
      location_text location_address location_visibility
      max_attendees waitlist_enabled requires_approval
      attendee_count_cached
      host { id name }
      rsvps { user_id status plus_ones user { name } }
    }
  }
`;

interface EventDetail {
  id: string; title: string; description: string | null;
  type: string; status: string; visibility: string;
  starts_at: string; ends_at: string | null; timezone: string | null; all_day: boolean;
  location_text: string | null; location_address: string | null; location_visibility: string;
  max_attendees: number | null; waitlist_enabled: boolean; requires_approval: boolean;
  attendee_count_cached: number;
  host: { id: string; name: string | null } | null;
  rsvps: Array<{ user_id: string; status: string; plus_ones: number; user: { name: string | null } | null }>;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { events_by_pk: event } = await client.request<{ events_by_pk: EventDetail | null }>(
    FETCH_EVENT, { id },
  );
  if (!event) notFound();

  const isHost = event.host?.id === session.user.id;
  // member-role RLS returns only own RSVP — for host, all RSVPs.
  const myRsvp = event.rsvps.find((r) => r.user_id === session.user.id);
  const allRsvps = isHost ? event.rsvps : [];

  const seatsLeft = event.max_attendees != null
    ? Math.max(0, event.max_attendees - event.attendee_count_cached)
    : null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/dashboard/events" className="text-sm text-(--color-muted) hover:text-(--color-deep) mb-4 inline-block">
        ← Назад к событиям
      </Link>

      {event.status !== 'published' && (
        <div className="mb-4 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          {event.status === 'draft' ? '📝 Черновик — пока не опубликовано' : 'Событие отменено'}
        </div>
      )}

      <h1 className="font-serif text-4xl font-semibold mb-3">{event.title}</h1>
      <p className="text-sm text-(--color-muted) mb-6">
        {EVENT_TYPE_LABELS[event.type as keyof typeof EVENT_TYPE_LABELS] ?? event.type}
        {event.host?.name && ` · Хост: ${event.host.name}`}
      </p>

      <dl className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-6 text-sm mb-8">
        <dt className="text-(--color-muted)">Когда</dt>
        <dd>
          {formatDateTime(event.starts_at)}
          {event.ends_at && ` — ${formatDateTime(event.ends_at)}`}
          <div className="text-xs text-(--color-muted) mt-1 font-serif">
            {hebrewDate(new Date(event.starts_at), 'ru')} · {hebrewDate(new Date(event.starts_at), 'he')}
          </div>
        </dd>
        {event.location_text && (
          <>
            <dt className="text-(--color-muted)">Где</dt>
            <dd>{event.location_text}{event.location_address && ` · ${event.location_address}`}</dd>
          </>
        )}
        <dt className="text-(--color-muted)">Участников</dt>
        <dd>
          {event.attendee_count_cached}
          {event.max_attendees && ` / ${event.max_attendees}`}
          {seatsLeft != null && seatsLeft > 0 && ` (${seatsLeft} мест свободно)`}
          {seatsLeft === 0 && ' · мест нет'}
        </dd>
      </dl>

      {event.description && (
        <div className="mb-8 prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap">{event.description}</p>
        </div>
      )}

      {/* RSVP */}
      {event.status === 'published' && (
        <section className="border-t pt-6 mb-8">
          <h2 className="font-serif text-xl font-semibold mb-3">Твой ответ</h2>
          <RsvpButtons
            eventId={event.id}
            currentStatus={myRsvp?.status}
            disabled={seatsLeft === 0 && myRsvp?.status !== 'yes' && !event.waitlist_enabled}
          />
        </section>
      )}

      {/* Host-only RSVP list */}
      {isHost && allRsvps.length > 0 && (
        <section className="border-t pt-6">
          <h2 className="font-serif text-xl font-semibold mb-3">Кто идёт ({allRsvps.length})</h2>
          <ul className="space-y-2">
            {allRsvps.map((r) => (
              <li key={r.user_id} className="flex items-center justify-between border-b pb-2 text-sm">
                <span>{r.user?.name ?? '—'}{r.plus_ones > 0 && ` (+${r.plus_ones})`}</span>
                <span className="text-(--color-muted)">{r.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
