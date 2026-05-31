'use client';

// Host action bar — cancel event with confirm.

import { useActionState, useState } from 'react';
import { cancelEvent } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Button } from '@/components/ui/button';

export function HostBar({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(cancelEvent, INITIAL_STATE);
  const [confirm, setConfirm] = useState(false);

  if (!confirm) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-2xl bg-primary/10 text-primary px-4 py-3 text-sm font-medium text-center">
          Вы — хост этого события
        </div>
        <Button variant="ghost" size="lg" className="rounded-full h-13 text-destructive hover:bg-destructive/8" onClick={() => setConfirm(true)}>
          Отменить
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="event_id" value={eventId} />
      <p className="text-xs text-muted-foreground text-center">Отменить событие? Участники получат уведомление.</p>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="lg" className="flex-1 rounded-full h-13" onClick={() => setConfirm(false)} disabled={pending}>
          Назад
        </Button>
        <Button type="submit" variant="destructive" size="lg" className="flex-1 rounded-full h-13" disabled={pending}>
          {pending ? 'Отменяю…' : 'Подтвердить'}
        </Button>
      </div>
      {state.formError && <p className="text-xs text-destructive text-center">{state.formError}</p>}
    </form>
  );
}
