// Edit an event — host or rabbi/admin only. Also exposes cancel.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EventForm } from '../../EventForm';
import { CancelEventButton } from './CancelEventButton';

const FETCH = /* GraphQL */ `
  query EditEvent($id: uuid!) {
    events_by_pk(id: $id) {
      id title description type starts_at ends_at timezone
      location_text max_attendees visibility status host_user_id community_id
    }
  }
`;

// Convert a UTC ISO timestamp to a value the datetime-local input expects,
// rendered in the event's timezone.
function toLocalInput(iso: string | null, tz: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  // Format in the target tz as YYYY-MM-DDTHH:mm
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz || undefined,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const { id } = await params;
  const t = await getTranslations('eventsPage');

  const data = await hasuraAdmin.request<{
    events_by_pk: {
      id: string; title: string; description: string | null; type: string;
      starts_at: string; ends_at: string | null; timezone: string | null;
      location_text: string | null; max_attendees: number | null;
      visibility: string; status: string; host_user_id: string; community_id: string;
    } | null;
  }>(FETCH, { id });

  const e = data.events_by_pk;
  if (!e) notFound();

  const role = session.hasura.default_role;
  const isStaff = role === 'rabbi' || role === 'admin';
  const isHost = e.host_user_id === session.user.id;
  // Must be host, or staff of the event's community.
  if (!isHost && !(isStaff && e.community_id === session.hasura.community_id)) {
    redirect(`/dashboard/events/${id}`);
  }

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-8">
      <Link
        href={`/dashboard/events/${id}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ChevronLeft size={14} className="rtl:-scale-x-100" /> {t('backToEvent')}
      </Link>

      <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight mb-5">
        {t('editEvent')}
      </h1>

      <EventForm
        eventId={e.id}
        defaults={{
          title: e.title,
          type: e.type,
          description: e.description ?? '',
          starts_at: toLocalInput(e.starts_at, e.timezone),
          ends_at: toLocalInput(e.ends_at, e.timezone),
          location_text: e.location_text ?? '',
          max_attendees: e.max_attendees != null ? String(e.max_attendees) : '',
          visibility: e.visibility,
        }}
      />

      {e.status !== 'cancelled' && (
        <div className="mt-8 pt-6 border-t border-border">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
            {t('dangerZone')}
          </h2>
          <CancelEventButton eventId={e.id} />
        </div>
      )}
    </div>
  );
}
