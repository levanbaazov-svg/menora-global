'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { withdrawReply } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';

export function WithdrawReplyButton({ replyId }: { replyId: string }) {
  const t = useTranslations('requestsPage.actions');
  const [state, action] = useActionState(withdrawReply, INITIAL_STATE);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="reply_id" value={replyId} />
      <button
        type="submit"
        className="text-xs text-(--color-fg-muted) hover:text-red-700"
      >
        {t('withdraw')}
      </button>
      {state.formError && <span className="text-xs text-red-600 ml-2">{state.formError}</span>}
    </form>
  );
}
