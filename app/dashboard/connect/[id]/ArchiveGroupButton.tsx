'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { archiveGroup } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Button } from '@/app/_components/ui/Button';

export function ArchiveGroupButton({ groupId }: { groupId: string }) {
  const t = useTranslations('connectPage.archive');
  const [state, formAction, pending] = useActionState(archiveGroup, INITIAL_STATE);
  const [confirm, setConfirm] = useState(false);

  if (!confirm) {
    return (
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={() => setConfirm(true)}
      >
        {t('button')}
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <p className="text-sm text-(--color-fg-muted)">
        {t('warning')}
      </p>
      <input type="hidden" name="group_id" value={groupId} />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirm(false)}
          disabled={pending}
        >
          {t('cancel')}
        </Button>
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          {pending ? '...' : t('confirm')}
        </Button>
      </div>
      {state.formError && (
        <p className="text-xs text-red-600">{state.formError}</p>
      )}
    </form>
  );
}
