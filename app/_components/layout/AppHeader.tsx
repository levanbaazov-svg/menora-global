'use client';

// Sticky app header — Lovable layout:
//   [avatar  greeting+name]                  [bell]  [menu ≡]
// Avatar is decorative; menu (right) opens the side Sheet.
// Translucent glass surface.

import { useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { Avatar } from '@/app/dashboard/_Avatar';
import { NotificationBell } from '@/app/dashboard/_NotificationBell';
import { SideDrawer } from './SideDrawer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { UserDisplay } from '@/lib/profile/display';

interface Props {
  user: UserDisplay;
  role: string;
  communityName?: string;
  signOutAction: () => Promise<void>;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 17) return 'Добрый день';
  if (h < 21) return 'Добрый вечер';
  return 'Доброй ночи';
}

export function AppHeader({ user, role, communityName, signOutAction }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const firstName = user.name?.split(' ')[0] ?? 'друг';

  return (
    <>
      <header
        className="
          sticky top-0 z-30 safe-top
          bg-background/72 backdrop-blur-[20px] backdrop-saturate-[180%]
          border-b border-border/40
        "
      >
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          {/* Identity (left) */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 min-w-0 transition-opacity hover:opacity-80 active:opacity-60"
          >
            <Avatar user={user} size="sm" />
            <div className="min-w-0 leading-tight">
              <div className="text-[10px] text-muted-foreground font-medium">
                {getGreeting()}
              </div>
              <div className="font-serif font-semibold text-sm truncate max-w-[160px]">
                {firstName}
              </div>
            </div>
          </Link>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-0.5">
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Поиск"
              className="rounded-full h-9 w-9 text-foreground/70 hover:text-foreground"
            >
              <Link href="/dashboard/discover">
                <Search size={18} strokeWidth={1.9} />
              </Link>
            </Button>
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Открыть меню"
              onClick={() => setDrawerOpen(true)}
              className="rounded-full h-9 w-9 text-foreground/70 hover:text-foreground"
            >
              <Menu size={20} strokeWidth={1.9} />
            </Button>
          </div>
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
