'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cancelEvent } from '../../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Button } from '@/components/ui/button';

export function CancelEventButton({ eventId }: { eventId: string }) {
  const t = useTranslations('eventsPage');
  const [state, action, pending] = useActionState(cancelEvent, INITIAL_STATE);
  const [confirm, setConfirm] = useState(false);

  if (!confirm) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="text-destructive hover:bg-destructive/8 rounded-full"
        onClick={() => setConfirm(true)}
      >
        {t('cancelEvent')}
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="event_id" value={eventId} />
      <p className="text-sm text-muted-foreground">
        {t('cancelNotice')}
      </p>
      <textarea
        name="reason"
        rows={2}
        placeholder={t('reasonPlaceholder')}
        className="w-full px-4 py-3 text-sm bg-card rounded-2xl border border-border focus:outline-none focus:border-destructive focus:ring-4 focus:ring-destructive/15 transition-all"
      />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1 rounded-full" onClick={() => setConfirm(false)} disabled={pending}>
          {t('back')}
        </Button>
        <Button type="submit" variant="destructive" className="flex-1 rounded-full" disabled={pending}>
          {pending ? t('cancelling') : t('confirmCancel')}
        </Button>
      </div>
      {state.formError && <p className="text-xs text-destructive">{state.formError}</p>}
    </form>
  );
}
