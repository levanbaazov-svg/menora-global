'use client';

// Keyboard-aware chrome. When the on-screen keyboard opens it shrinks the
// WebView (Capacitor iOS uses native resize), which would leave the fixed
// bottom tab bar floating just above the keyboard — looking broken, especially
// on the flex-filled home screen. We detect the height drop and toggle a
// `keyboard-open` class on <html>; CSS then tucks the tab bar away while typing
// and restores it when the keyboard closes.
//
// Pure web — works in the Capacitor WebView and the PWA, no native plugin.

import { useEffect } from 'react';

export function KeyboardChrome() {
  useEffect(() => {
    const root = document.documentElement;
    // Track the tallest viewport we've seen (= keyboard closed). Comparing the
    // current height against it tells us when the keyboard is up. Using the max
    // (not the initial) keeps it correct across orientation changes.
    let maxH = window.innerHeight;

    const update = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      maxH = Math.max(maxH, h);
      root.classList.toggle('keyboard-open', h < maxH - 120);
    };

    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      root.classList.remove('keyboard-open');
    };
  }, []);

  return null;
}
