'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/app/dashboard/_Avatar';
import type { UserDisplay } from '@/lib/profile/display';

interface MenuItem {
  href: string;
  icon: string;
  label: string;
  hint?: string;
  highlight?: boolean;
}

const EXPLORE: MenuItem[] = [
  { href: '/dashboard',                icon: '🏠', label: 'Главная',     hint: 'AI Rabbi · ежедневное' },
  { href: '/dashboard/community',      icon: '🕍', label: 'Моя община',  hint: 'Места · программы · события' },
  { href: '/dashboard/people',         icon: '👥', label: 'Участники',   hint: 'Кто в общине' },
  { href: '/dashboard/events',         icon: '📅', label: 'События',     hint: 'RSVP и создать' },
  { href: '/dashboard/requests',       icon: '🙋', label: 'Просьбы',    hint: 'Доска помощи' },
  { href: '/dashboard/routines',       icon: '🕯', label: 'Моя рутина',  hint: 'Молитвы · стрик' },
  { href: '/dashboard/discover',       icon: '✨', label: 'Discover',    hint: 'Вдохновение · парша · аудио' },
];

const ME: MenuItem[] = [
  { href: '/dashboard/me',             icon: '👤', label: 'Мой профиль' },
  { href: '/dashboard/me/jewish-id',   icon: '🪪', label: 'Jewish ID',   highlight: true },
  { href: '/dashboard/notifications',  icon: '🔔', label: 'Уведомления' },
];

const ADMIN: MenuItem[] = [
  { href: '/dashboard/members',        icon: '✓', label: 'Заявки и доступ' },
  { href: '/dashboard/invitations',    icon: '✉️', label: 'Приглашения' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  user: UserDisplay;
  role: string;
  communityName?: string;
  signOutAction: () => Promise<void>;
}

export function SideDrawer({ open, onClose, user, role, communityName, signOutAction }: Props) {
  // Close on ESC
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const isStaff = role === 'rabbi' || role === 'admin';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-[88%] max-w-sm bg-(--color-bg-elevated) shadow-2xl
                    transition-transform duration-300 ease-out
                    ${open ? 'translate-x-0' : '-translate-x-full'}
                    overflow-y-auto safe-top safe-bottom`}
      >
        {/* Header — user identity */}
        <div className="px-6 pt-8 pb-6 border-b border-(--color-border)/60">
          <div className="flex items-start gap-4">
            <Avatar user={user} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="font-serif text-xl font-semibold truncate">{user.name ?? user.email}</div>
              {communityName && (
                <div className="text-sm text-(--color-fg-muted) mt-0.5">{communityName}</div>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Закрыть"
              className="w-9 h-9 rounded-full hover:bg-(--color-muted-bg) flex items-center justify-center text-(--color-fg-muted)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* EXPLORE */}
        <Section title="Explore" items={EXPLORE} onClose={onClose} />

        {/* ME */}
        <Section title="Мне" items={ME} onClose={onClose} />

        {/* ADMIN (only rabbi/admin) */}
        {isStaff && <Section title="Управление" items={ADMIN} onClose={onClose} />}

        {/* AI tip */}
        <div className="mx-4 my-4 p-4 bg-(--color-deep) text-white rounded-2xl">
          <div className="text-xs uppercase tracking-wide opacity-70 mb-1.5">✨ AI tip</div>
          <p className="text-sm leading-relaxed">
            Большинство задач здесь можно просто попросить AI Rabbi сделать за тебя.
          </p>
        </div>

        {/* Sign out */}
        <form
          action={signOutAction}
          className="px-4 py-3"
        >
          <button
            type="submit"
            className="w-full text-left px-4 py-3 text-sm text-(--color-fg-muted) hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            Выйти
          </button>
        </form>

        <div className="px-6 py-3 text-xs text-(--color-fg-subtle)">
          Menorah Global · v0.1
        </div>
      </aside>
    </>
  );
}

function Section({ title, items, onClose }: { title: string; items: MenuItem[]; onClose: () => void }) {
  return (
    <div className="px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-(--color-fg-subtle) px-3 mb-2">{title}</div>
      <ul>
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-(--color-muted-bg) transition-colors ${
                it.highlight ? 'bg-(--color-gold-soft)/30' : ''
              }`}
            >
              <span className="w-9 h-9 rounded-full bg-(--color-muted-bg) flex items-center justify-center text-lg shrink-0">
                {it.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{it.label}</div>
                {it.hint && <div className="text-xs text-(--color-fg-muted)">{it.hint}</div>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
