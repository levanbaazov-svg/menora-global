'use client';

// In-app "request to join" for an already-onboarded member joining an
// additional community. No onboarding redirect — creates a pending membership.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { requestJoinCommunity } from '@/app/dashboard/community/_actions';

export function JoinCommunityButton({ communityId }: { communityId: string }) {
  const router = useRouter();
  const t = useTranslations('communityMisc');
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function join() {
    if (pending) return;
    setError(null);
    start(async () => {
      const r = await requestJoinCommunity(communityId);
      if (r.ok) { setSent(true); router.refresh(); }
      else setError(r.error ?? t('errorGeneric'));
    });
  }

  if (sent) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-full h-13 bg-muted font-medium text-foreground">
        <Clock size={16} /> {t('requestSent')}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={join}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-full h-13 bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-gold)] disabled:opacity-70"
      >
        {pending ? <Loader2 size={17} className="animate-spin" /> : <UserPlus size={16} strokeWidth={2.2} />}
        {t('requestToJoin')}
      </button>
      {error && <p className="text-xs text-destructive text-center mt-1.5">{error}</p>}
    </>
  );
}
