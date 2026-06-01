'use client';

// Community switcher for multi-community members. Shows the active community
// with a chevron; tapping reveals the other communities. Switching calls the
// server action, then refreshes so the new active community takes effect.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { switchCommunity } from '@/app/dashboard/_actions/switch-community';

export interface CommunityOption {
  id: string;
  name: string;
  city: string | null;
}

export function CommunitySwitcher({
  communities,
  activeId,
}: {
  communities: CommunityOption[];
  activeId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const active = communities.find((c) => c.id === activeId) ?? communities[0];
  // Single community → static label, no switcher affordance.
  const multi = communities.length > 1;

  function choose(id: string) {
    if (id === activeId) { setOpen(false); return; }
    startTransition(async () => {
      const res = await switchCommunity(id);
      setOpen(false);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-card ring-1 ring-border/70 overflow-hidden">
      <button
        type="button"
        disabled={!multi || pending}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${multi ? 'hover:bg-muted/50' : 'cursor-default'}`}
      >
        <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/12 text-primary flex items-center justify-center">
          <Building2 size={16} strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Активная община</div>
          <div className="text-sm font-medium leading-tight truncate">{active?.name ?? '—'}</div>
        </div>
        {multi && <ChevronsUpDown size={15} className="shrink-0 text-muted-foreground/60" />}
      </button>

      {open && multi && (
        <div className="border-t border-border/60 divide-y divide-border/50">
          {communities.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={pending}
              onClick={() => choose(c.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-tight truncate">{c.name}</div>
                {c.city && <div className="text-[11px] text-muted-foreground truncate">{c.city}</div>}
              </div>
              {c.id === activeId && <Check size={15} className="shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
