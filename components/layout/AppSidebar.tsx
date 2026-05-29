'use client';

// Desktop persistent sidebar (md+). Uses shadcn Sidebar primitive.
// On mobile this becomes a Sheet via SidebarTrigger / useSidebar.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  PRIMARY_NAV, EXPLORE_NAV, PERSONAL_NAV, ADMIN_NAV,
  isActive, type NavItem,
} from './nav-config';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { UserDisplay } from '@/lib/profile/display';
import { Sparkles, LogOut } from 'lucide-react';

interface Props {
  user: UserDisplay;
  role: 'member' | 'rabbi' | 'admin';
  communityName?: string;
  signOutAction: () => Promise<void>;
}

export function AppSidebar({ user, role, communityName, signOutAction }: Props) {
  const pathname = usePathname() ?? '/dashboard';
  const isStaff = role === 'rabbi' || role === 'admin';

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="font-serif italic text-lg font-semibold leading-tight tracking-tight">
              Menorah
            </div>
            {communityName && (
              <div className="text-xs text-muted-foreground truncate">{communityName}</div>
            )}
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Главное"   items={PRIMARY_NAV}  pathname={pathname} />
        <NavGroup label="Открыть"   items={EXPLORE_NAV}  pathname={pathname} />
        <NavGroup label="Личное"    items={PERSONAL_NAV} pathname={pathname} />
        {isStaff && (
          <NavGroup label="Управление" items={ADMIN_NAV} pathname={pathname} />
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="group-data-[collapsible=icon]:!p-2">
              <Link href="/dashboard/me" className="flex items-center gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={user.image_url ?? undefined} alt={user.name ?? ''} />
                  <AvatarFallback>{(user.name ?? '?').slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
                  <div className="text-sm font-medium truncate">{user.name ?? 'Без имени'}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <form action={signOutAction} className="w-full">
              <SidebarMenuButton type="submit" size="sm" tooltip="Выйти">
                <LogOut className="h-4 w-4" />
                <span>Выйти</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function NavGroup({
  label, items, pathname,
}: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(pathname, item);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                  <Link href={item.href}>
                    <item.Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.highlight && (
                      <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">
                        new
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
