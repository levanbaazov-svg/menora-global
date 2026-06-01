import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EventForm } from '../EventForm';

export default async function NewEventPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (!session.hasMembership) redirect('/dashboard');
  const t = await getTranslations('eventsPage');

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-8">
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ChevronLeft size={14} className="rtl:-scale-x-100" /> {t('backToEventsList')}
      </Link>
      <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight mb-5">
        {t('newEvent')}
      </h1>
      <EventForm />
    </div>
  );
}
