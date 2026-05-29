'use client';

// Top bar: sidebar trigger (mobile) / breadcrumb area / notifications.
// Sticky with glass blur.

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { NotificationBell } from './NotificationBell';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function AppTopBar() {
  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2
                 border-b border-border/60 px-3 md:px-4 safe-top
                 glass"
    >
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-5 hidden md:block" />
      <Link href="/dashboard" className="flex items-center gap-1.5 md:hidden" aria-label="Главная">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-serif italic font-semibold tracking-tight">Menorah</span>
      </Link>
      <div className="flex-1" />
      <NotificationBell />
    </header>
  );
}
