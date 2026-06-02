import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CreateCommunityForm } from './CreateCommunityForm';

export default async function NewCommunityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const t = await getTranslations('communityPages');

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-6 pt-6 pb-12">
      <Link
        href="/dashboard/community/discover"
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← {t('back.communities')}
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-2">{t('newCommunity.title')}</h1>
      <p className="text-sm text-(--color-fg-muted) mb-8">{t('newCommunity.subtitle')}</p>

      <CreateCommunityForm />
    </div>
  );
}
