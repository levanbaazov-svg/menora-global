'use client';

// Inline one-click approve for pending members / places, straight from the
// Rabbi Console. Refreshes the console (counts) on success.

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { approveMembership } from '@/app/dashboard/members/_actions';
import { approvePlace } from '@/app/dashboard/community/_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';

export function QuickApprove({ kind, id, label }: { kind: 'member' | 'place'; id: string; label: string }) {
  const t = useTranslations('admin');
  const router = useRouter();
  const [state, action, pending] = useActionState(
    kind === 'member' ? approveMembership : approvePlace,
    INITIAL_STATE,
  );
  useEffect(() => { if (state.ok) router.refresh(); }, [state.ok, router]);

  if (state.ok) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-card ring-1 ring-border/60 px-3.5 py-2.5 text-sm text-muted-foreground">
        <Check size={15} className="text-emerald-500 shrink-0" />
        <span className="truncate">{label}</span>
        <span className="ms-auto text-xs">{t('approved')}</span>
      </div>
    );
  }

  return (
    <form action={action} className="flex items-center gap-2 rounded-xl bg-card ring-1 ring-border/60 px-3.5 py-2 hover:ring-primary/30 transition-shadow">
      <input type="hidden" name={kind === 'member' ? 'membership_id' : 'place_id'} value={id} />
      <span className="flex-1 truncate text-sm font-medium">{label}</span>
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 h-7 text-xs font-semibold disabled:opacity-60"
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.6} />}
        {t('approve')}
      </button>
    </form>
  );
}
