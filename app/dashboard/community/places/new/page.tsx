import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
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

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-6 pt-6 pb-12">
      <Link
        href="/dashboard/community"
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← В город-гид
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-2">
        {isStaff ? 'Добавить место' : 'Предложить место'}
      </h1>
      <p className="text-sm text-(--color-fg-muted) mb-8">
        {isStaff
          ? 'Сразу появится в city-guide для всех членов общины и туристов.'
          : 'Раввин проверит и опубликует в городе-гиде.'}
      </p>

      <NewPlaceForm defaultType={defaultType} isStaff={isStaff} />
    </div>
  );
}
