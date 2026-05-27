'use client';

import { useActionState } from 'react';
import { revokeInvitation } from './_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';

export function RevokeButton({ id }: { id: string }) {
  const [state, action] = useActionState(revokeInvitation, INITIAL_STATE);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-xs px-3 py-1 rounded border hover:bg-red-50 hover:border-red-300 hover:text-red-700"
        title={state.formError ?? undefined}
      >
        Отозвать
      </button>
    </form>
  );
}
