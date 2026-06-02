// Edit an interest group — creator or rabbi/admin only.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { NewGroupForm } from '../../new/NewGroupForm';

const FETCH = /* GraphQL */ `
  query EditGroup($id: uuid!) {
    interest_groups_by_pk(id: $id) {
      id category name description photo_url visibility
      frequency meeting_location tags created_by_user_id archived_at
    }
  }
`;

interface Resp {
  interest_groups_by_pk: {
    id: string;
    category: string;
    name: string;
    description: string | null;
    photo_url: string | null;
    visibility: string;
    frequency: string | null;
    meeting_location: string | null;
    tags: string[];
    created_by_user_id: string | null;
    archived_at: string | null;
  } | null;
}

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const t = await getTranslations('connectPage');
  const { id } = await params;
  const role = session.hasura.default_role;

  const client = await hasuraAsCurrentUser({ role });
  const data = await client.request<Resp>(FETCH, { id });

  const g = data.interest_groups_by_pk;
  if (!g || g.archived_at) notFound();

  const isStaff = role === 'rabbi' || role === 'admin';
  const isCreator = g.created_by_user_id === session.user.id;
  if (!isCreator && !isStaff) {
    redirect(`/dashboard/connect/${id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-6 pt-2 pb-12">
      <Link
        href={`/dashboard/connect/${id}`}
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        <span className="inline-block rtl:-scale-x-100">←</span> {t('backToGroup')}
      </Link>

      <header className="mb-8">
        <div className="text-xs uppercase tracking-widest text-(--color-gold) mb-1">
          {t('new.eyebrow')}
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight">
          {t('edit.title')}
        </h1>
      </header>

      <NewGroupForm
        editId={id}
        initial={{
          category: g.category,
          name: g.name,
          description: g.description ?? '',
          photo_url: g.photo_url ?? '',
          visibility: g.visibility,
          frequency: g.frequency ?? '',
          meeting_location: g.meeting_location ?? '',
          tags: g.tags,
        }}
      />
    </div>
  );
}
