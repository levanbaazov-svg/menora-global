'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { joinGroup, leaveGroup } from './_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Button } from '@/app/_components/ui/Button';

export function JoinLeaveButton({
  groupId,
  isMember,
  fullWidth,
}: {
  groupId: string;
  isMember: boolean;
  fullWidth?: boolean;
}) {
  const t = useTranslations('connectPage.joinLeave');
  const action = isMember ? leaveGroup : joinGroup;
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  return (
    <form action={formAction} className={fullWidth ? 'w-full' : 'inline'}>
      <input type="hidden" name="group_id" value={groupId} />
      <Button
        type="submit"
        variant={isMember ? 'ghost' : 'gold'}
        size="md"
        fullWidth={fullWidth}
        disabled={pending}
      >
        {pending
          ? '...'
          : isMember
            ? t('joined')
            : t('join')}
      </Button>
      {state.formError && (
        <p className="text-xs text-red-600 mt-2">{state.formError}</p>
      )}
    </form>
  );
}
