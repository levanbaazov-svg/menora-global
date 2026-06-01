import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { NewRoutineForm } from './NewRoutineForm';

export default async function NewRoutinePage() {
  const t = await getTranslations('personal');
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/dashboard/routines" className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block">
        {t('routines.new.back')}
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-2">{t('routines.new.title')}</h1>
      <p className="text-sm text-(--color-fg-muted) mb-8">
        {t('routines.new.subtitle')}
      </p>
      <NewRoutineForm />
    </div>
  );
}
