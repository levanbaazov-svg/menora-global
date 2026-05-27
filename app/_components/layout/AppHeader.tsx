'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/app/dashboard/_Avatar';
import { NotificationBell } from '@/app/dashboard/_NotificationBell';
import { SideDrawer } from './SideDrawer';
import type { UserDisplay } from '@/lib/profile/display';

interface Props {
  user: UserDisplay;
  role: string;
  communityName?: string;
  signOutAction: () => Promise<void>;
}

export function AppHeader({ user, role, communityName, signOutAction }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 glass border-b border-(--color-border)/60 safe-top">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          {/* Avatar = drawer trigger (mobile) / logo+name (desktop) */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2.5 hover:opacity-80 active:opacity-60 transition-opacity"
            aria-label="Открыть меню"
          >
            <Avatar user={user} size="sm" />
          </button>

          {/* Center — Logo */}
          <Link href="/dashboard" className="flex-1 flex items-center justify-center">
            <span className="font-serif text-lg font-semibold tracking-tight">
              Menorah
            </span>
          </Link>

          {/* Right — Notifications */}
          <NotificationBell />
        </div>
      </header>

      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        role={role}
        communityName={communityName}
        signOutAction={signOutAction}
      />
    </>
  );
}
