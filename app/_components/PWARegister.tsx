'use client';

import { useEffect } from 'react';

// Registers the service worker (enables PWA install + cached static assets).
export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* non-fatal */ });
    }
  }, []);
  return null;
}
