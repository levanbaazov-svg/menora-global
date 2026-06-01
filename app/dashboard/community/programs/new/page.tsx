import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { NewProgramForm } from './NewProgramForm';
import { PROGRAM_CATEGORIES, type ProgramCategory } from '@/lib/places/schema';

export default async function NewProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const role = session.hasura.default_role;
  if (role !== 'rabbi' && role !== 'admin') redirect('/dashboard/community');

  const { category } = await searchParams;
  const preset = (PROGRAM_CATEGORIES as readonly string[]).includes(category ?? '')
    ? (category as ProgramCategory)
    : undefined;

  const t = await getTranslations('communityPages');

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-6 pt-6 pb-12">
      <Link
        href="/dashboard/community/manage"
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← {t('back.community')}
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-2">{t('newProgram.title')}</h1>
      <p className="text-sm text-(--color-fg-muted) mb-8">{t('newProgram.subtitle')}</p>

      <NewProgramForm presetCategory={preset} />
    </div>
  );
}
