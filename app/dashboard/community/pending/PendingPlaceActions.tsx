'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { approvePlace, rejectPlace } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';

export function PendingPlaceActions({ placeId }: { placeId: string }) {
  const t = useTranslations('communityMisc');
  const [approveState, approveAction] = useActionState(approvePlace, INITIAL_STATE);
  const [rejectState, rejectActionFn] = useActionState(rejectPlace, INITIAL_STATE);
  const [showReject, setShowReject] = useState(false);

  if (showReject) {
    return (
      <form action={rejectActionFn} className="flex items-end gap-2">
        <input type="hidden" name="place_id" value={placeId} />
        <textarea
          name="reason"
          required rows={2}
          placeholder={t('rejectReason')}
          className="text-xs px-2 py-1.5 border rounded w-48 max-w-full"
        />
        <button
          type="button"
          onClick={() => setShowReject(false)}
          className="text-xs px-3 py-1.5 rounded border hover:bg-(--color-muted-bg)"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700"
        >
          {t('reject')}
        </button>
        {rejectState.formError && (
          <span className="text-xs text-red-600">{rejectState.formError}</span>
        )}
      </form>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <form action={approveAction} className="inline">
        <input type="hidden" name="place_id" value={placeId} />
        <button
          type="submit"
          className="text-xs px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 font-medium"
        >
          ✓ {t('publish')}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setShowReject(true)}
        className="text-xs px-3 py-1.5 rounded border hover:bg-red-50 hover:border-red-300 hover:text-red-700"
      >
        {t('reject')}
      </button>
      {approveState.formError && (
        <span className="text-xs text-red-600">{approveState.formError}</span>
      )}
    </div>
  );
}
