// Single source of truth for navigation across mobile bottom nav, desktop
// sidebar, and side drawer. Uses lucide icons (not emoji) for scalable
// consistency and a11y.

import {
  Home,
  Building2,
  Users,
  Calendar,
  HandHeart,
  Sparkles,
  Bell,
  User,
  ShieldCheck,
  MailPlus,
  CircleHelp,
  BookHeart,
  ScanLine,
  Bot,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Match prefix for active-state detection */
  match: string;
  /** Optional short hint shown in sidebar */
  hint?: string;
  /** Show only for rabbi/admin */
  staffOnly?: boolean;
  /** Highlight badge */
  highlight?: boolean;
}

/** Primary tabs visible in mobile bottom nav (5 max). */
export const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard',           label: 'Главная',  Icon: Home,      match: '/dashboard' },
  { href: '/dashboard/community', label: 'Община',   Icon: Building2, match: '/dashboard/community' },
  { href: '/dashboard/inspire',   label: 'Inspire',  Icon: Sparkles,  match: '/dashboard/inspire' },
  { href: '/dashboard/connect',   label: 'Связь',    Icon: Users,     match: '/dashboard/connect' },
  { href: '/dashboard/events',    label: 'События',  Icon: Calendar,  match: '/dashboard/events' },
];

/** Secondary "Explore" group shown in sidebar / drawer. */
export const EXPLORE_NAV: NavItem[] = [
  { href: '/dashboard/ai-rabbi',     label: 'AI Раввин',   Icon: Bot,         match: '/dashboard/ai-rabbi',     hint: '6 сценариев + чат' },
  { href: '/dashboard/requests',     label: 'Просьбы',     Icon: HandHeart,   match: '/dashboard/requests',     hint: 'Доска помощи' },
  { href: '/dashboard/routines',     label: 'Рутины',      Icon: BookHeart,   match: '/dashboard/routines',     hint: 'Молитвы · стрик' },
  { href: '/dashboard/people',       label: 'Участники',   Icon: Users,       match: '/dashboard/people',       hint: 'Кто в общине' },
  { href: '/dashboard/notifications',label: 'Уведомления', Icon: Bell,        match: '/dashboard/notifications' },
];

/** Personal group: profile + Jewish ID */
export const PERSONAL_NAV: NavItem[] = [
  { href: '/dashboard/me',           label: 'Мой профиль', Icon: User,        match: '/dashboard/me' },
  { href: '/dashboard/me/jewish-id', label: 'Jewish ID',   Icon: ScanLine,    match: '/dashboard/me/jewish-id', highlight: true },
];

/** Rabbi / admin tools group */
export const ADMIN_NAV: NavItem[] = [
  { href: '/dashboard/assistant',        label: 'AI Ассистент',    Icon: Sparkles,    match: '/dashboard/assistant',        hint: 'Голос · CRM · задачи', highlight: true, staffOnly: true },
  { href: '/dashboard/community/manage', label: 'Управление',      Icon: ShieldCheck, match: '/dashboard/community/manage', hint: 'Места · программы',                   staffOnly: true },
  { href: '/dashboard/community/pending',label: 'Модерация',       Icon: CircleHelp,  match: '/dashboard/community/pending',hint: 'Очередь заявок',                       staffOnly: true },
  { href: '/dashboard/members',          label: 'Заявки и доступ', Icon: Users,       match: '/dashboard/members',                                                       staffOnly: true },
  { href: '/dashboard/invitations',      label: 'Приглашения',     Icon: MailPlus,    match: '/dashboard/invitations',                                                   staffOnly: true },
];

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(item.match);
}
