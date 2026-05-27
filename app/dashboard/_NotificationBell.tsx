'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  const panelRef = useRef<HTMLDivElement>(null);

  async function fetchData() {
    try {
      const r = await fetch('/api/me/notifications', { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      setCount(data.count ?? 0);
      setItems(data.recent ?? []);
    } catch {
      // network blip — ignore
    }
  }

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

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
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-full hover:bg-(--color-muted-bg) flex items-center justify-center text-lg"
        title="Уведомления"
      >
        🔔
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[28rem] overflow-y-auto bg-white border rounded-xl shadow-lg z-50">
          <div className="sticky top-0 bg-white border-b px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Уведомления</span>
            {count > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-(--color-muted) hover:text-(--color-deep)"
              >
                Прочитать все
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-(--color-muted)">
              Пока пусто.
            </div>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onItemClick(n)}
                    className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-(--color-muted-bg) ${
                      n.read_at ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read_at && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-(--color-gold) shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight">{n.title}</div>
                        {n.body && (
                          <div className="text-xs text-(--color-muted) mt-1 line-clamp-2">{n.body}</div>
                        )}
                        <div className="text-xs text-(--color-muted) mt-1">
                          {n.actor?.name && `${n.actor.name} · `}{ago(n.created_at)}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t bg-(--color-muted-bg) px-4 py-2 text-center">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-(--color-muted) hover:text-(--color-deep)"
            >
              Вся история →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
