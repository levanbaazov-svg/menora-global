// /dashboard/discover — global platform search.

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { DiscoverSearch } from './DiscoverSearch';

export default async function DiscoverPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const t = await getTranslations('discover');

  return (
    <>
      <header className="container mx-auto max-w-xl px-4 md:px-6 pt-3 px-0.5">
        <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
          {t('title')}
        </h1>
      </header>
      <DiscoverSearch />
    </>
  );
}
