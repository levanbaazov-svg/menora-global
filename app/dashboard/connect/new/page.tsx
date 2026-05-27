// New group form.

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NewGroupForm } from './NewGroupForm';
import { GROUP_CATEGORIES, type GroupCategory } from '@/lib/groups/schema';

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (!session.hasMembership) redirect('/dashboard');

  const sp = await searchParams;
  const preset = sp.cat && (GROUP_CATEGORIES as readonly string[]).includes(sp.cat)
    ? (sp.cat as GroupCategory)
    : undefined;

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-6 pt-2 pb-12">
      <Link
        href="/dashboard/connect"
        className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block"
      >
        ← К группам
      </Link>

      <header className="mb-8">
        <div className="text-xs uppercase tracking-widest text-(--color-gold) mb-1">
          Связь
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight">
          Создать группу
        </h1>
        <p className="text-sm text-(--color-fg-muted) mt-2 max-w-xl">
          Один проект — одна группа. Кратко опиши о чём встречаемся и как часто.
          Остальное добавишь позже.
        </p>
      </header>

      <NewGroupForm presetCategory={preset} />
    </div>
  );
}
