'use client';

// Google sign-in that works in BOTH the web app and the native Capacitor shell.
//  - Web: normal next-auth Google OAuth redirect.
//  - Native (iOS/Android): uses the native Google SDK to get an ID token (Google
//    blocks OAuth inside WebViews), then exchanges it via the 'google-native'
//    credentials provider.

import { useState } from 'react';
import { signIn } from 'next-auth/react';

// Web OAuth client ID — @capawesome/capacitor-google-sign-in requires the WEB
// client id on every platform (it's the server client id the ID token targets).
const GOOGLE_WEB_CLIENT_ID =
  '874288364269-00sv6l337hfa5jpav02n1c6oonoj2rtr.apps.googleusercontent.com';

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C40.9 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

export function GoogleSignInButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        // Native: get a Google ID token from the device SDK, then exchange it.
        const { GoogleSignIn } = await import('@capawesome/capacitor-google-sign-in');
        await GoogleSignIn.initialize({ clientId: GOOGLE_WEB_CLIENT_ID });
        const result = await GoogleSignIn.signIn();
        if (!result.idToken) throw new Error('No ID token from Google');
        await signIn('google-native', { idToken: result.idToken, callbackUrl: '/dashboard' });
      } else {
        // Web: standard OAuth redirect.
        await signIn('google', { callbackUrl: '/dashboard' });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handle}
        disabled={loading}
        className="inline-flex items-center gap-3 px-7 h-14 rounded-full bg-(--color-deep) text-white font-semibold hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 shadow-[var(--shadow-lg)] hover:shadow-[var(--shadow-xl)] focus-visible:outline-(--color-gold) disabled:opacity-70"
      >
        <GoogleLogo />
        <span>{label}</span>
      </button>
      {error && <p className="text-xs text-destructive mt-3">{error}</p>}
    </>
  );
}
