// Admin/rabbi moderation queue for member-submitted places.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PLACE_TYPE_LABELS, type PlaceType } from '@/lib/places/schema';
import { EmptyState } from '@/app/_components/ui/EmptyState';
import { PendingPlaceActions } from './PendingPlaceActions';

const FETCH = /* GraphQL */ `
  query PendingPlaces($community_id: uuid!) {
    places(
      where: {
        community_id: { _eq: $community_id }
        submission_status: { _eq: pending }
      }
      order_by: { created_at: asc }
    ) {
      id type name description photo_url address city
      contact_phone contact_email website_url
      kashrut_level kashrut_authority price_level
      cuisine_tags dietary_tags hours_notes
      created_at
      submitter { id name email }
    }
  }
`;

interface PendingPlace {
  id: string; type: PlaceType; name: string;
  description: string | null; photo_url: string | null;
  address: string | null; city: string | null;
  contact_phone: string | null; contact_email: string | null; website_url: string | null;
  kashrut_level: string | null; kashrut_authority: string | null;
  price_level: string | null;
  cuisine_tags: string[]; dietary_tags: string[];
  hours_notes: string | null;
  created_at: string;
  submitter: { id: string; name: string | null; email: string | null } | null;
}

export default async function PendingQueuePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const role = session.hasura.default_role;
  if (role !== 'rabbi' && role !== 'admin') redirect('/dashboard/community');

  const client = await hasuraAsCurrentUser({ role });
  const { places } = await client.request<{ places: PendingPlace[] }>(
    FETCH, { community_id: session.hasura.community_id },
  );

  return (
    <div className="container mx-auto max-w-2xl px-4 md:px-6 pt-3 pb-8">
      <Link
        href="/dashboard/community"
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← В город-гид
      </Link>

      <header className="mb-6">
        <div className="text-xs uppercase tracking-widest text-(--color-warning) mb-1">
          Модерация
        </div>
        <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
          Предложенные места
        </h1>
        <p className="text-sm text-(--color-fg-muted) mt-2">
          Места предложенные участниками. Одобри — появятся в city-guide для всех.
          Отклони — никто кроме автора их не увидит.
        </p>
      </header>

      {places.length === 0 ? (
        <EmptyState
          emoji="✓"
          title="Нет заявок на рассмотрение"
          description="Участники ещё не предлагали новые места. Когда предложат — увидишь их здесь."
        />
      ) : (
        <div className="space-y-4">
          {places.map((p) => (
            <PendingCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PendingCard({ p }: { p: PendingPlace }) {
  const meta = PLACE_TYPE_LABELS[p.type];
  return (
    <div className="rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 overflow-hidden">
      <div className="flex items-start gap-4 p-4">
        <div
          className="shrink-0 w-20 h-20 rounded-xl bg-(--color-muted-bg) flex items-center justify-center text-3xl"
          style={p.photo_url ? { background: `url(${p.photo_url}) center/cover no-repeat` } : undefined}
        >
          {!p.photo_url && meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs text-(--color-fg-muted)">{meta.emoji} {meta.ru.slice(0, -1)}</span>
            {p.kashrut_authority && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-(--color-gold-soft) text-(--color-gold-dark)">
                {p.kashrut_authority}
              </span>
            )}
            {p.price_level && <span className="text-xs">{p.price_level}</span>}
          </div>
          <h3 className="font-serif text-lg font-semibold">{p.name}</h3>
          {p.address && <p className="text-xs text-(--color-fg-muted) mt-0.5">📍 {p.address}{p.city ? `, ${p.city}` : ''}</p>}
          {p.description && <p className="text-sm text-(--color-fg-muted) mt-2 line-clamp-3">{p.description}</p>}

          <div className="mt-3 text-xs text-(--color-fg-subtle)">
            Предложил: {p.submitter?.name ?? p.submitter?.email ?? '—'} · {new Date(p.created_at).toLocaleDateString('ru-RU')}
          </div>
        </div>
      </div>

      <div className="border-t border-(--color-border)/60 px-4 py-3 flex items-center justify-between gap-2 bg-(--color-bg-muted)/30">
        <Link href={`/dashboard/community/places/${p.id}`} className="text-xs text-(--color-fg-muted) hover:text-(--color-deep)">
          Открыть детали →
        </Link>
        <PendingPlaceActions placeId={p.id} />
      </div>
    </div>
  );
}
