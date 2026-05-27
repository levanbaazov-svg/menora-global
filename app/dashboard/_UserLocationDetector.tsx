'use client';

// Client-only mount-hook: reads browser timezone, POSTs to /api/me/timezone
// when it differs from the server-known value. Triggers a router refresh
// so the HebrewCalendarCard re-renders with the user's local times.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  /** Tz currently saved in cookie (server-side rendered). null = never detected. */
  currentTz: string | null;
}

export function UserLocationDetector({ currentTz }: Props) {
  const router = useRouter();
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!detected) return;
      if (detected === currentTz) return;
      void fetch('/api/me/timezone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tz: detected }),
      }).then((r) => {
        if (r.ok) router.refresh();
      });
    } catch {
      // Intl unavailable or fetch failed — silently skip
    }
  }, [currentTz, router]);
  return null;
}
