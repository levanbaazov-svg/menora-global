// Host action bar — links to the edit page where the host can change
// details or cancel the event.

import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function HostBar({ eventId }: { eventId: string }) {
  const t = await getTranslations('eventsPage');
  return (
    <Link
      href={`/dashboard/events/${eventId}/edit`}
      className="flex items-center justify-center gap-2 rounded-full h-13 bg-foreground text-background font-semibold shadow-[var(--shadow-md)] hover:opacity-95 active:scale-[0.98] transition-all"
    >
      <Settings2 size={17} strokeWidth={2} />
      {t('manageEvent')}
    </Link>
  );
}
