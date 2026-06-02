import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { NewProgramForm } from '../../new/NewProgramForm';

const FETCH = /* GraphQL */ `
  query EditProgram($id: uuid!) {
    programs_by_pk(id: $id) {
      id category name description photo_url schedule_text
      age_min age_max price_amount price_currency price_period
      max_capacity registration_url registration_open requires_approval location_text
    }
  }
`;

export default async function EditProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const role = session.hasura.default_role;
  if (role !== 'rabbi' && role !== 'admin') redirect('/dashboard/community');

  const { id } = await params;
  const data = await hasuraAdmin.request<{ programs_by_pk: Record<string, unknown> | null }>(FETCH, { id });
  const p = data.programs_by_pk;
  if (!p) notFound();

  const t = await getTranslations('communityPages');

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-6 pt-6 pb-12">
      <Link
        href={`/dashboard/community/programs/${id}`}
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← {t('back.community')}
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-6">{t('newProgram.editTitle')}</h1>
      <NewProgramForm editId={id} initial={p} />
    </div>
  );
}
