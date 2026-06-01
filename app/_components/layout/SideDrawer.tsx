'use client';

// Right-side Sheet menu. Houses all "personal / less-frequent" items that
// don't belong on the home screen (calendar, jewish-id, profile, settings,
// admin tools, sign-out).
//
// Built on shadcn Sheet + lucide icons + sectioned grouped lists.

import Link from 'next/link';
import {
  Sparkles, Flame, BookOpenText, ScanLine, Bell, UserRound,
  Bot, ShieldCheck, MailPlus, Settings2, LogOut, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { Avatar } from '@/app/dashboard/_Avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { UserDisplay } from '@/lib/profile/display';
import { CommunitySwitcher, type CommunityOption } from './CommunitySwitcher';

interface MenuItem {
  href: string;
  Icon: LucideIcon;
  label: string;
  badge?: string;
  highlight?: boolean;
}

// Items that DON'T duplicate the bottom-nav tabs.
// Personal / utility / admin only.
const SPIRITUAL: MenuItem[] = [
  { href: '/dashboard/ai-rabbi',       Icon: Sparkles,      label: 'AI Раввин' },
  { href: '/dashboard/routines',       Icon: Flame,         label: 'Моя рутина' },
  { href: '/dashboard/inspire',        Icon: BookOpenText,  label: 'Парша · праздники · мудрости' },
];

const PERSONAL: MenuItem[] = [
  { href: '/dashboard/me/jewish-id',   Icon: ScanLine,      label: 'Jewish ID',     highlight: true },
  { href: '/dashboard/me',             Icon: UserRound,     label: 'Мой профиль' },
  { href: '/dashboard/notifications',  Icon: Bell,          label: 'Уведомления' },
];

const ADMIN: MenuItem[] = [
  { href: '/dashboard/assistant',          Icon: Bot,          label: 'AI Ассистент',  highlight: true },
  { href: '/dashboard/community/pending',  Icon: ShieldCheck,  label: 'Модерация мест' },
  { href: '/dashboard/members',            Icon: UserRound,    label: 'Заявки и доступ' },
  { href: '/dashboard/invitations',        Icon: MailPlus,     label: 'Приглашения' },
  { href: '/dashboard/community/manage',   Icon: Settings2,    label: 'Управление общиной' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  user: UserDisplay;
  role: string;
  communityName?: string;
  communities?: CommunityOption[];
  activeCommunityId?: string;
  signOutAction: () => Promise<void>;
}

export function SideDrawer({ open, onClose, user, role, communityName, communities, activeCommunityId, signOutAction }: Props) {
  const isStaff = role === 'rabbi' || role === 'admin';

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="
          w-[88%] max-w-sm gap-0 p-0
          bg-background
          flex flex-col safe-top safe-bottom
        "
      >
        {/* Identity header */}
        <SheetHeader className="px-5 pt-5 pb-4 gap-0 border-b border-border/60">
          <div className="flex items-center gap-3">
            <Avatar user={user} size="lg" />
            <div className="flex-1 min-w-0">
              <SheetTitle className="font-serif text-lg font-semibold truncate text-left">
                {user.name ?? user.email}
              </SheetTitle>
              {communityName && (
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {communityName}
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable middle */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {communities && communities.length > 1 && activeCommunityId && (
            <CommunitySwitcher communities={communities} activeId={activeCommunityId} />
          )}
          <SectionList title="Духовное" items={SPIRITUAL} onClose={onClose} />
          <SectionList title="Личное" items={PERSONAL} onClose={onClose} />
          {isStaff && <SectionList title="Управление" items={ADMIN} onClose={onClose} />}
        </div>

        {/* Sign out + footer */}
        <div className="border-t border-border/60 px-3 py-3 space-y-2">
          <form action={signOutAction}>
            <button
              type="submit"
              className="
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                text-foreground/70 hover:bg-destructive/8 hover:text-destructive transition-colors
              "
            >
              <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                <LogOut size={16} strokeWidth={1.9} />
              </span>
              <span>Выйти</span>
            </button>
          </form>
          <div className="px-3 pb-1 text-[10px] text-muted-foreground/70">
            Menorah Global · v0.2
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionList({
  title, items, onClose,
}: {
  title: string;
  items: MenuItem[];
  onClose: () => void;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70 px-3 mb-2 font-semibold">
        {title}
      </div>
      <ul className="space-y-0.5">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors group
                hover:bg-muted/60
                ${it.highlight ? 'bg-primary/8 hover:bg-primary/12' : ''}
              `}
            >
              <span
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors
                  ${it.highlight ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground/70 group-hover:text-foreground'}
                `}
              >
                <it.Icon size={16} strokeWidth={1.9} />
              </span>
              <span className="flex-1 font-medium truncate">{it.label}</span>
              {it.badge && (
                <Badge variant="secondary" className="text-[10px]">{it.badge}</Badge>
              )}
              <ChevronRight size={14} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
            </Link>
          </li>
        ))}
      </ul>
      <Separator className="mt-4" />
    </div>
  );
}
