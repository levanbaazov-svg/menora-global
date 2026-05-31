'use client';

// Sticky RSVP action bar: Иду / Возможно / Не иду. Current choice highlighted.

import { useActionState } from 'react';
import { setRsvp } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Check, HelpCircle, X } from 'lucide-react';

const OPTIONS = [
  { status: 'yes',   label: 'Иду',      Icon: Check },
  { status: 'maybe', label: 'Возможно', Icon: HelpCircle },
  { status: 'no',    label: 'Не иду',   Icon: X },
] as const;

export function RsvpBar({
  eventId, current,
}: {
  eventId: string;
  current: string | null;
}) {
  const [state, action, pending] = useActionState(setRsvp, INITIAL_STATE);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-card ring-1 ring-border/70 p-1.5 shadow-[0_6px_20px_-6px_rgba(20,24,31,0.16)]">
        {OPTIONS.map((o) => {
          const active = current === o.status;
          return (
            <form key={o.status} action={action}>
              <input type="hidden" name="event_id" value={eventId} />
              <input type="hidden" name="status" value={o.status} />
              <button
                type="submit"
                disabled={pending}
                className={`
                  w-full flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-medium
                  transition-colors disabled:opacity-60
                  ${active
                    ? o.status === 'yes'
                      ? 'bg-primary text-primary-foreground'
                      : o.status === 'no'
                        ? 'bg-muted text-foreground'
                        : 'bg-amber-100 text-amber-800'
                    : 'text-foreground/65 hover:bg-muted'}
                `}
              >
                <o.Icon size={17} strokeWidth={2} />
                {o.label}
              </button>
            </form>
          );
        })}
      </div>
      {state.formError && (
        <p className="text-xs text-destructive mt-2 text-center">{state.formError}</p>
      )}
    </div>
  );
}
