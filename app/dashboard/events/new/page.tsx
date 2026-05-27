import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NewEventForm } from './NewEventForm';

export default async function NewEventPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (!session.hasMembership) redirect('/dashboard');

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/dashboard/events" className="text-sm text-(--color-muted) hover:text-(--color-deep) mb-4 inline-block">
        ← Назад к событиям
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-8">Новое событие</h1>
      <NewEventForm />
    </div>
  );
}
