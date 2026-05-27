'use client';

import { useOptimistic, useTransition } from 'react';
import { setCheckin } from './_actions';

interface Props {
  routineId: string;
  done: boolean;
}

/**
 * Optimistic check button: UI flips instantly, server confirms in background.
 * If the server fails, the next render reconciles back from real state.
 */
export function CheckinButton({ routineId, done }: Props) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(done, (_, next: boolean) => next);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const next = !optimisticDone;
    startTransition(async () => {
      setOptimisticDone(next);
      await setCheckin(routineId, next);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all disabled:opacity-70 ${
        optimisticDone
          ? 'bg-(--color-gold) text-(--color-deep) hover:bg-(--color-gold)/80'
          : 'border-2 border-dashed border-(--color-muted) hover:border-(--color-gold) hover:bg-(--color-gold-soft)'
      }`}
      title={optimisticDone ? 'Снять отметку' : 'Отметить выполненной'}
    >
      {optimisticDone ? '✓' : ''}
    </button>
  );
}
