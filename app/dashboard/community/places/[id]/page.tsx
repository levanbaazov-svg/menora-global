import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { type Locale } from '@/i18n/config';
import {
  PLACE_TYPE_LABELS, KASHRUT_LABELS, CUISINE_LABELS, DIETARY_LABELS,
  type PlaceType, type KashrutLevel,
} from '@/lib/places/schema';
import { Chip } from '@/app/_components/ui/Card';
import { LinkButton } from '@/app/_components/ui/Button';

const FETCH = /* GraphQL */ `
  query FetchPlace($id: uuid!) {
    places_by_pk(id: $id) {
      id type name description photo_url
      address city country_code neighborhood
      latitude longitude
      hours_schedule hours_notes
      contact_phone contact_email website_url reservation_url
      kashrut_level kashrut_authority price_level
      cuisine_tags dietary_tags
      has_women_section has_parking_shabbat prayer_times_url denomination
      accepts_reservations wheelchair_accessible family_friendly
      submission_status created_at
      community { id name }
      submitter { id name }
    }
  }
`;

interface Place {
  id: string; type: PlaceType; name: string;
  description: string | null; photo_url: string | null;
  address: string | null; city: string | null; country_code: string | null;
  neighborhood: string | null;
  latitude: number | null; longitude: number | null;
  hours_schedule: Record<string, unknown>; hours_notes: string | null;
  contact_phone: string | null; contact_email: string | null;
  website_url: string | null; reservation_url: string | null;
  kashrut_level: KashrutLevel | null; kashrut_authority: string | null;
  price_level: string | null;
  cuisine_tags: string[]; dietary_tags: string[];
  has_women_section: boolean | null; has_parking_shabbat: boolean | null;
  prayer_times_url: string | null; denomination: string | null;
  accepts_reservations: boolean; wheelchair_accessible: boolean | null;
  family_friendly: boolean | null;
  submission_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  community: { id: string; name: string } | null;
  submitter: { id: string; name: string | null } | null;
}

export default async function PlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { places_by_pk: place } = await client.request<{ places_by_pk: Place | null }>(
    FETCH, { id },
  );
  if (!place) notFound();

  const t = await getTranslations('communityPages');
  const locale = (await getLocale()) as Locale;
  const meta = PLACE_TYPE_LABELS[place.type];
  const kashrut = place.kashrut_level && place.kashrut_level !== 'none' ? KASHRUT_LABELS[place.kashrut_level] : null;
  const mapsUrl = place.address
    ? `https://maps.google.com/?q=${encodeURIComponent([place.address, place.city, place.country_code].filter(Boolean).join(', '))}`
    : null;

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-6 pt-2 pb-12">
      <Link
        href={`/dashboard/community?cat=${place.type}`}
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← {meta.emoji} {meta[locale]}
      </Link>

      {/* Hero photo */}
      <div
        className="aspect-[16/9] -mx-5 md:mx-0 md:rounded-2xl overflow-hidden mb-6 bg-(--color-muted-bg) relative"
        style={place.photo_url ? { background: `url(${place.photo_url}) center/cover no-repeat` } : undefined}
      >
        {!place.photo_url && (
          <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-30">
            {meta.emoji}
          </div>
        )}
        {place.submission_status === 'pending' && (
          <Chip tone="soft-gold" className="absolute top-4 left-4">
            {t('placeDetail.pending')}
          </Chip>
        )}
      </div>

      {/* Header */}
      <div className="mb-5">
        <div className="text-sm text-(--color-fg-muted) mb-1">{meta.emoji} {meta[locale]}</div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight">{place.name}</h1>
        <div className="flex flex-wrap gap-2 mt-3">
          {kashrut && <Chip tone="soft-gold">{kashrut.label}{place.kashrut_authority ? ` · ${place.kashrut_authority}` : ''}</Chip>}
          {place.price_level && <Chip tone="neutral">{place.price_level}</Chip>}
          {place.family_friendly && <Chip tone="neutral">{t('placeDetail.familyFriendly')}</Chip>}
          {place.wheelchair_accessible && <Chip tone="neutral">{t('placeDetail.accessible')}</Chip>}
          {place.accepts_reservations && <Chip tone="neutral">{t('placeDetail.reservations')}</Chip>}
        </div>
      </div>

      {/* Description */}
      {place.description && (
        <p className="text-base text-(--color-fg) leading-relaxed mb-6 whitespace-pre-wrap">{place.description}</p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-8">
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-(--color-deep) text-white font-semibold text-sm hover:opacity-90"
          >
            {t('placeDetail.route')}
          </a>
        )}
        {place.contact_phone && (
          <a
            href={`tel:${place.contact_phone}`}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-(--color-border) hover:border-(--color-gold) text-sm font-semibold"
          >
            {t('placeDetail.call')}
          </a>
        )}
        {place.reservation_url && (
          <LinkButton href={place.reservation_url} variant="gold" size="md">
            {t('placeDetail.book')}
          </LinkButton>
        )}
      </div>

      {/* Details grid */}
      <section className="mb-8">
        <dl className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-6 text-sm">
          {place.address && (
            <>
              <dt className="text-(--color-fg-muted)">{t('placeDetail.address')}</dt>
              <dd>
                {[place.address, place.neighborhood, place.city, place.country_code].filter(Boolean).join(', ')}
              </dd>
            </>
          )}
          {place.hours_notes && (
            <>
              <dt className="text-(--color-fg-muted)">{t('placeDetail.hours')}</dt>
              <dd className="whitespace-pre-wrap">{place.hours_notes}</dd>
            </>
          )}
          {place.contact_phone && (
            <>
              <dt className="text-(--color-fg-muted)">{t('placeDetail.phone')}</dt>
              <dd>
                <a href={`tel:${place.contact_phone}`} className="hover:underline">{place.contact_phone}</a>
              </dd>
            </>
          )}
          {place.contact_email && (
            <>
              <dt className="text-(--color-fg-muted)">{t('placeDetail.email')}</dt>
              <dd>
                <a href={`mailto:${place.contact_email}`} className="hover:underline">{place.contact_email}</a>
              </dd>
            </>
          )}
          {place.website_url && (
            <>
              <dt className="text-(--color-fg-muted)">{t('placeDetail.website')}</dt>
              <dd>
                <a href={place.website_url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate inline-block max-w-full">
                  {place.website_url.replace(/^https?:\/\//, '')}
                </a>
              </dd>
            </>
          )}
        </dl>
      </section>

      {/* Cuisine + dietary chips */}
      {(place.cuisine_tags.length > 0 || place.dietary_tags.length > 0) && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-2">{t('placeDetail.cuisineDiet')}</h2>
          <div className="flex flex-wrap gap-1.5">
            {place.cuisine_tags.map((t) => (
              <Chip key={t} tone="neutral">{CUISINE_LABELS[t] ?? t}</Chip>
            ))}
            {place.dietary_tags.map((t) => (
              <Chip key={t} tone="neutral">{DIETARY_LABELS[t] ?? t}</Chip>
            ))}
          </div>
        </section>
      )}

      {/* Synagogue features */}
      {place.type === 'synagogue' && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-2">{t('placeDetail.features')}</h2>
          <ul className="space-y-1 text-sm">
            {place.has_women_section != null && (
              <li>{place.has_women_section ? '✓' : '✗'} {t('placeDetail.womenSection')}</li>
            )}
            {place.has_parking_shabbat != null && (
              <li>{place.has_parking_shabbat ? '✓' : '✗'} {t('placeDetail.parkingShabbat')}</li>
            )}
            {place.denomination && <li>{t('placeDetail.denomination', { value: place.denomination })}</li>}
            {place.prayer_times_url && (
              <li>
                <a href={place.prayer_times_url} target="_blank" rel="noopener noreferrer" className="text-(--color-gold-dark) hover:underline">
                  {t('placeDetail.prayerSchedule')}
                </a>
              </li>
            )}
          </ul>
        </section>
      )}

      {/* Footer meta */}
      <section className="border-t pt-4 text-xs text-(--color-fg-subtle)">
        {place.community && <>{t('placeDetail.inCommunity', { name: place.community.name })} · </>}
        {place.submitter?.name && <>{t('placeDetail.addedBy', { name: place.submitter.name })}</>}
      </section>
    </div>
  );
}
