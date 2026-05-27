'use client';

import { useActionState } from 'react';
import { deleteRoutine, toggleEnabled } from './_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';

export function ToggleEnabledButton({ id, enabled }: { id: string; enabled: boolean }) {
  const [state, action] = useActionState(toggleEnabled, INITIAL_STATE);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="routine_id" value={id} />
      <input type="hidden" name="enabled" value={String(!enabled)} />
      <button
        type="submit"
        className="text-xs px-3 py-1 rounded border hover:bg-(--color-muted-bg)"
        title={enabled ? 'Приостановить' : 'Включить'}
      >
        {enabled ? '⏸ Пауза' : '▶ Возобновить'}
      </button>
      {state.formError && <span className="text-xs text-red-600 ml-2">{state.formError}</span>}
    </form>
  );
}

export function DeleteRoutineButton({ id, label }: { id: string; label: string }) {
  const [state, action] = useActionState(deleteRoutine, INITIAL_STATE);
  return (
    <form
      action={action}
      className="inline"
      onSubmit={(e) => {
        if (!confirm(`Удалить «${label}»? История чекинов тоже пропадёт.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="routine_id" value={id} />
      <button
        type="submit"
        className="text-xs px-3 py-1 rounded border hover:bg-red-50 hover:border-red-300 hover:text-red-700"
      >
        Удалить
      </button>
      {state.formError && <span className="text-xs text-red-600 ml-2">{state.formError}</span>}
    </form>
  );
}
