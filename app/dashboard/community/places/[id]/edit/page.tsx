import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { NewPlaceForm } from '../../new/NewPlaceForm';

const FETCH = /* GraphQL */ `
  query EditPlace($id: uuid!) {
    places_by_pk(id: $id) {
      id type name description photo_url address city country_code neighborhood
      kashrut_level kashrut_authority price_level cuisine_tags dietary_tags
      has_women_section has_parking_shabbat prayer_times_url
      contact_phone contact_email website_url reservation_url hours_notes
      accepts_reservations wheelchair_accessible family_friendly
    }
  }
`;

export default async function EditPlacePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const role = session.hasura.default_role;
  const isStaff = role === 'rabbi' || role === 'admin';
  if (!isStaff) redirect('/dashboard/community');

  const { id } = await params;
  const data = await hasuraAdmin.request<{ places_by_pk: Record<string, unknown> | null }>(FETCH, { id });
  const place = data.places_by_pk;
  if (!place) notFound();

  const t = await getTranslations('communityPages');

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-6 pt-6 pb-12">
      <Link
        href={`/dashboard/community/places/${id}`}
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← {t('back.cityGuide')}
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-6">{t('newPlace.editTitle')}</h1>
      <NewPlaceForm isStaff={isStaff} editId={id} initial={place} />
    </div>
  );
}
