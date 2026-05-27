'use client';

import { useActionState } from 'react';
import {
  markFulfilled, markInProgress, cancelRequest, reopenRequest, acceptReply,
} from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';

interface AuthorActionsProps {
  requestId: string;
  status: 'open' | 'in_progress' | 'fulfilled' | 'expired' | 'cancelled';
}

export function AuthorActions({ requestId, status }: AuthorActionsProps) {
  if (status === 'open' || status === 'in_progress') {
    return (
      <div className="flex gap-2 flex-wrap">
        {status === 'open' && <MarkButton requestId={requestId} action="in_progress" label="🤝 В работе" />}
        <MarkButton requestId={requestId} action="fulfilled" label="✓ Закрыть как выполненную" variant="gold" />
        <MarkButton requestId={requestId} action="cancel" label="Отменить" variant="ghost" />
      </div>
    );
  }
  if (status === 'fulfilled' || status === 'cancelled' || status === 'expired') {
    return <MarkButton requestId={requestId} action="reopen" label="↻ Открыть заново" variant="ghost" />;
  }
  return null;
}

function MarkButton({
  requestId, action, label, variant = 'dark',
}: {
  requestId: string; action: 'in_progress' | 'fulfilled' | 'cancel' | 'reopen';
  label: string; variant?: 'dark' | 'gold' | 'ghost';
}) {
  const fn = action === 'in_progress' ? markInProgress
          : action === 'fulfilled'  ? markFulfilled
          : action === 'cancel'     ? cancelRequest
                                    : reopenRequest;
  const [state, handler] = useActionState(fn, INITIAL_STATE);
  const cls = variant === 'gold'  ? 'bg-(--color-gold) text-(--color-deep) hover:opacity-90'
            : variant === 'ghost' ? 'border hover:bg-(--color-muted-bg)'
                                  : 'bg-(--color-deep) text-white hover:opacity-90';
  return (
    <form action={handler} className="inline">
      <input type="hidden" name="request_id" value={requestId} />
      <button type="submit" className={`px-4 py-2 rounded-full text-sm font-semibold ${cls}`}>
        {label}
      </button>
      {state.formError && <span className="text-xs text-red-600 ml-2">{state.formError}</span>}
    </form>
  );
}

export function AcceptReplyButton({ requestId, replyId }: { requestId: string; replyId: string }) {
  const [state, action] = useActionState(acceptReply, INITIAL_STATE);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="request_id" value={requestId} />
      <input type="hidden" name="reply_id" value={replyId} />
      <button
        type="submit"
        className="text-xs px-3 py-1.5 rounded-full bg-(--color-gold) text-(--color-deep) font-semibold hover:opacity-90"
        title="Этот ответ решил вопрос — закрыть просьбу"
      >
        ✓ Принять этот ответ
      </button>
      {state.formError && <span className="text-xs text-red-600 ml-2">{state.formError}</span>}
    </form>
  );
}
