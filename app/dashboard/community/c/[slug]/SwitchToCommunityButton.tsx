'use client';

// Shown on a community you belong to but which isn't your active one.
// Switches the active community, then opens the member community page.

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { switchCommunity } from '@/app/dashboard/_actions/switch-community';

export function SwitchToCommunityButton({ communityId }: { communityId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function go() {
    if (pending) return;
    start(async () => {
      const r = await switchCommunity(communityId);
      if (r.ok) router.push('/dashboard/community');
    });
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-full h-13 bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-gold)] disabled:opacity-70"
    >
      {pending
        ? <Loader2 size={17} className="animate-spin" />
        : <ArrowLeftRight size={16} strokeWidth={2.2} />}
      Перейти в эту общину
    </button>
  );
}
