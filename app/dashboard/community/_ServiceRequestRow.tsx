'use client';

// One-tap service order. Tapping a service immediately creates a 'services'
// request for the rabbi (no form — the service is already specific) and the row
// flips to a friendly "request received, we'll be in touch" confirmation.

import { useState, useTransition } from 'react';
import {
  DoorOpen, Box, Flame, Wine, UtensilsCrossed, HeartHandshake, BookMarked,
  ChevronRight, Check, Loader2, type LucideIcon,
} from 'lucide-react';
import type { CommunityService, ServiceIcon } from '@/lib/services/catalog';
import { requestService } from '@/app/dashboard/requests/_actions';

const SERVICE_ICONS: Record<ServiceIcon, LucideIcon> = {
  mezuzah:  DoorOpen,
  tefillin: Box,
  candles:  Flame,
  shabbat:  Wine,
  kosher:   UtensilsCrossed,
  kaddish:  HeartHandshake,
  books:    BookMarked,
};

export interface ServiceRowLabels {
  free: string;
  request: string;
  sentTitle: string;
  sentBody: string;
  error: string;
}

export function ServiceRequestRow({ service, labels }: {
  service: CommunityService;
  labels: ServiceRowLabels;
}) {
  const Icon = SERVICE_ICONS[service.icon];
  const [pending, start] = useTransition();
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle');

  function submit() {
    if (pending || state === 'sent') return;
    start(async () => {
      const r = await requestService(service.slug);
      setState(r.ok ? 'sent' : 'error');
    });
  }

  if (state === 'sent') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-primary/8 ring-1 ring-primary/25 px-4 py-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Check size={16} strokeWidth={2.6} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium leading-tight">{labels.sentTitle}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{labels.sentBody}</div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={submit}
      disabled={pending}
      className="group w-full flex items-center gap-3 rounded-2xl bg-card ring-1 ring-border/70 px-4 py-3 text-start hover:ring-primary/30 transition-all disabled:opacity-70"
    >
      <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/12 text-primary flex items-center justify-center">
        <Icon size={16} strokeWidth={1.9} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-tight flex items-center gap-2">
          <span className="truncate">{service.title}</span>
          {service.free && (
            <span className="shrink-0 rounded-full bg-primary/12 text-primary text-[10px] font-semibold px-2 py-0.5">
              {labels.free}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
          {state === 'error' ? labels.error : service.teaser}
        </div>
      </div>
      {pending ? (
        <Loader2 size={16} strokeWidth={2} className="shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <>
          <span className="shrink-0 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
            {labels.request}
          </span>
          <ChevronRight size={15} className="shrink-0 text-muted-foreground/50 rtl:-scale-x-100" />
        </>
      )}
    </button>
  );
}
