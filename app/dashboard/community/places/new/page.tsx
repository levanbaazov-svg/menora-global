import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { NewPlaceForm } from './NewPlaceForm';
import { PLACE_TYPES, type PlaceType } from '@/lib/places/schema';

export default async function NewPlacePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const { type: typeParam } = await searchParams;
  const defaultType = (PLACE_TYPES as readonly string[]).includes(typeParam ?? '')
    ? (typeParam as PlaceType)
    : undefined;

  const role = session.hasura.default_role;
  const isStaff = role === 'rabbi' || role === 'admin';
  const t = await getTranslations('communityPages');

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-6 pt-6 pb-12">
      <Link
        href="/dashboard/community"
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← {t('back.cityGuide')}
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-2">
        {isStaff ? t('newPlace.titleStaff') : t('newPlace.titleMember')}
      </h1>
      <p className="text-sm text-(--color-fg-muted) mb-8">
        {isStaff ? t('newPlace.subtitleStaff') : t('newPlace.subtitleMember')}
      </p>

      <NewPlaceForm defaultType={defaultType} isStaff={isStaff} />
    </div>
  );
}
