import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { NewRequestForm } from './NewRequestForm';

export default async function NewRequestPage() {
  const t = await getTranslations('requestsPage.new');
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/dashboard/requests" className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block">
        <span className="inline-block rtl:-scale-x-100">←</span> {t('backToBoard')}
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-2">{t('title')}</h1>
      <p className="text-sm text-(--color-fg-muted) mb-8">
        {t('subtitle')}
      </p>
      <NewRequestForm />
    </div>
  );
}
