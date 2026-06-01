'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import {
  approveMembership, rejectMembership,
  changeMemberRole, suspendMembership, unsuspendMembership,
} from './_actions';

interface Props {
  membershipId: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected' | 'left';
  role: 'member' | 'rabbi' | 'admin';
  selfId: string;
  targetUserId: string;
}

export function MemberActions({ membershipId, status, role, selfId, targetUserId }: Props) {
  const isSelf = selfId === targetUserId;

  if (status === 'pending') return <PendingActions membershipId={membershipId} />;
  if (status === 'active' && !isSelf) {
    return <ActiveActions membershipId={membershipId} currentRole={role} />;
  }
  if (status === 'suspended' && !isSelf) {
    return <UnsuspendOnly membershipId={membershipId} />;
  }
  // rejected, left, or self → no actions
  return null;
}

function PendingActions({ membershipId }: { membershipId: string }) {
  const [approveState, approveAction] = useActionState(approveMembership, INITIAL_STATE);
  const [rejectState, rejectAction] = useActionState(rejectMembership, INITIAL_STATE);
  const [showReject, setShowReject] = useState(false);
  const t = useTranslations('directory');

  if (showReject) {
    return (
      <form action={rejectAction} className="flex flex-col gap-2 items-end">
        <input type="hidden" name="membership_id" value={membershipId} />
        <textarea
          name="reason"
          required
          rows={2}
          placeholder={t('members.actions.rejectPlaceholder')}
          className={`w-full max-w-xs px-3 py-2 border rounded text-xs ${rejectState.errors?.reason ? 'border-red-500' : ''}`}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowReject(false)}
            className="text-xs px-3 py-1 rounded border hover:bg-(--color-muted-bg)"
          >
            {t('members.actions.cancel')}
          </button>
          <button
            type="submit"
            className="text-xs px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
          >
            {t('members.actions.reject')}
          </button>
        </div>
        {rejectState.formError && <p className="text-xs text-red-600">{rejectState.formError}</p>}
      </form>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <form action={approveAction} className="inline">
        <input type="hidden" name="membership_id" value={membershipId} />
        <button
          type="submit"
          className="text-xs px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 font-medium"
        >
          {t('members.actions.accept')}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setShowReject(true)}
        className="text-xs px-3 py-1.5 rounded border hover:bg-red-50 hover:border-red-300 hover:text-red-700"
      >
        {t('members.actions.rejectShort')}
      </button>
      {approveState.formError && (
        <span className="text-xs text-red-600">{approveState.formError}</span>
      )}
    </div>
  );
}

function ActiveActions({ membershipId, currentRole }: { membershipId: string; currentRole: 'member' | 'rabbi' | 'admin' }) {
  const [roleState, roleAction] = useActionState(changeMemberRole, INITIAL_STATE);
  const [suspState, suspAction] = useActionState(suspendMembership, INITIAL_STATE);
  const t = useTranslations('directory');

  // Admin role is not changeable from this UI.
  if (currentRole === 'admin') {
    return <span className="text-xs text-(--color-fg-muted) italic">{t('members.actions.adminLocked')}</span>;
  }

  return (
    <div className="flex gap-2 items-center">
      <form action={roleAction} className="inline">
        <input type="hidden" name="membership_id" value={membershipId} />
        <select
          name="role"
          defaultValue={currentRole}
          onChange={(e) => (e.target.form as HTMLFormElement).requestSubmit()}
          className="text-xs px-2 py-1 border rounded bg-white"
        >
          <option value="member">member</option>
          <option value="rabbi">rabbi</option>
        </select>
      </form>
      <form action={suspAction} className="inline">
        <input type="hidden" name="membership_id" value={membershipId} />
        <button
          type="submit"
          className="text-xs px-3 py-1 rounded border hover:bg-yellow-50 hover:border-yellow-400"
          title={t('members.actions.suspendTitle')}
        >
          ⏸
        </button>
      </form>
      {(roleState.formError || suspState.formError) && (
        <span className="text-xs text-red-600">{roleState.formError ?? suspState.formError}</span>
      )}
    </div>
  );
}

function UnsuspendOnly({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(unsuspendMembership, INITIAL_STATE);
  const t = useTranslations('directory');
  return (
    <form action={action} className="inline">
      <input type="hidden" name="membership_id" value={membershipId} />
      <button
        type="submit"
        className="text-xs px-3 py-1.5 rounded border hover:bg-green-50 hover:border-green-400"
      >
        {t('members.actions.unsuspend')}
      </button>
      {state.formError && <span className="text-xs text-red-600 ml-2">{state.formError}</span>}
    </form>
  );
}
