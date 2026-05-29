'use client';

// shadcn-based notification bell. Polls /api/me/notifications, shows badge
// count + dropdown preview, marks read on click.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotificationItem {
  id: string; type: string; title: string; body: string | null; link: string | null;
  read_at: string | null; created_at: string;
  actor: { id: string; name: string | null; image_url: string | null } | null;
}

const POLL_INTERVAL_MS = 30_000;

function ago(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'только что';
  if (s < 3600) return `${Math.floor(s / 60)} мин`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч`;
  return `${Math.floor(s / 86400)} д`;
}

export function NotificationBell() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  async function fetchData() {
    try {
      const r = await fetch('/api/me/notifications', { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      setCount(data.count ?? 0);
      setItems(data.recent ?? []);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  async function markRead(ids: string[]) {
    await fetch('/api/me/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    await fetchData();
  }

  async function markAllRead() {
    await fetch('/api/me/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    await fetchData();
  }

  function onItemClick(n: NotificationItem) {
    if (!n.read_at) markRead([n.id]);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Уведомления">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <Badge
              variant="default"
              className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1.5 text-[10px] tabular-nums"
            >
              {count > 9 ? '9+' : count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <div className="font-semibold text-sm">Уведомления</div>
          {items.some((n) => !n.read_at) && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 text-xs">
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Прочитать всё
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Пока тихо. Здесь появятся уведомления о событиях, ответах и приглашениях.
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onItemClick(n)}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex gap-2"
                  >
                    {!n.read_at && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium leading-snug">{n.title}</div>
                      {n.body && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-1">{ago(n.created_at)}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <Link
          href="/dashboard/notifications"
          onClick={() => setOpen(false)}
          className="block border-t border-border/60 px-3 py-2 text-center text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          Все уведомления →
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
