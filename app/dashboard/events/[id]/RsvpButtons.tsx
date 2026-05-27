'use client';

import { useActionState } from 'react';
import { setRsvp } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';

interface Props {
  eventId: string;
  currentStatus?: string;
  disabled?: boolean;
}

const OPTIONS: Array<{ value: string; label: string; cls: string }> = [
  { value: 'yes',   label: '✓ Иду',      cls: 'bg-green-100 text-green-800 hover:bg-green-200' },
  { value: 'maybe', label: '? Возможно', cls: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
  { value: 'no',    label: '✗ Не смогу', cls: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
];

export function RsvpButtons({ eventId, currentStatus, disabled }: Props) {
  const [state, action] = useActionState(setRsvp, INITIAL_STATE);

  return (
    <div>
      <form action={action} className="flex gap-2 flex-wrap">
        <input type="hidden" name="event_id" value={eventId} />
        {OPTIONS.map((o) => {
          const isCurrent = currentStatus === o.value;
          return (
            <button
              key={o.value}
              type="submit"
              name="status"
              value={o.value}
              disabled={disabled}
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-colors ${
                isCurrent
                  ? 'bg-(--color-deep) text-white'
                  : o.cls
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {o.label}
              {isCurrent && ' (выбрано)'}
            </button>
          );
        })}
      </form>
      {state.formError && (
        <p className="text-xs text-red-600 mt-2">{state.formError}</p>
      )}
    </div>
  );
}
