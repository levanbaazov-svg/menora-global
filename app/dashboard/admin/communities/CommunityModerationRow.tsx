'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { approveCommunity, rejectCommunity } from '@/app/dashboard/community/_actions';

export function CommunityModerationActions({ communityId }: { communityId: string }) {
  const t = useTranslations('admin.platform');
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: (fd: FormData) => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const fd = new FormData();
      fd.set('community_id', communityId);
      const r = await fn(fd);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button" disabled={pending} onClick={() => run(approveCommunity)}
        className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 h-8 text-xs font-semibold disabled:opacity-60"
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.6} />} {t('approve')}
      </button>
      <button
        type="button" disabled={pending} onClick={() => run(rejectCommunity)}
        className="inline-flex items-center gap-1 rounded-full border border-destructive/30 text-destructive px-3 h-8 text-xs font-medium hover:bg-destructive/10 disabled:opacity-60"
      >
        <X size={13} /> {t('reject')}
      </button>
    </div>
  );
}
