'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';

interface Props {
  token: string;
  signedIn: boolean;
}

export function AcceptButton({ token, signedIn }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('directory');

  async function handleAccept() {
    setError(null);
    const res = await fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'accept_failed');
      return;
    }
    // Force JWT refresh so allowed_community_ids includes the new community.
    // Simplest robust way: sign out → sign in (round-trip through NextAuth).
    // The user is already authenticated with Google, so signIn is one-click.
    startTransition(() => {
      router.refresh();
      router.push('/dashboard');
    });
  }

  if (!signedIn) {
    return (
      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl: `/invite?token=${token}` })}
        className="px-8 py-3 rounded-full bg-(--color-gold) text-(--color-deep) font-semibold hover:scale-105 transition-transform"
      >
        {t('invite.signInAndAccept')}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={handleAccept}
        className="px-8 py-3 rounded-full bg-(--color-gold) text-(--color-deep) font-semibold hover:scale-105 transition-transform disabled:opacity-50"
      >
        {pending ? t('invite.accepting') : t('invite.accept')}
      </button>
      {error && (
        <p className="text-sm text-red-600 mt-3">
          {error === 'invitation_invalid_or_expired'
            ? t('invite.errorInvalid')
            : error === 'unauthorized'
              ? t('invite.errorUnauthorized')
              : t('invite.errorGeneric', { error })}
        </p>
      )}
      <p className="text-xs text-(--color-fg-muted) mt-4">
        {t('invite.refreshNote')}
      </p>
    </div>
  );
}
