// /dashboard/discover — global platform search.

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DiscoverSearch } from './DiscoverSearch';

export default async function DiscoverPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  return (
    <>
      <header className="container mx-auto max-w-xl px-4 md:px-6 pt-3 px-0.5">
        <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
          Поиск
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          По всей платформе — общины, события, люди, группы
        </p>
      </header>
      <DiscoverSearch />
    </>
  );
}
