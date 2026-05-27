'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

interface Props {
  token: string;
  signedIn: boolean;
}

export function AcceptButton({ token, signedIn }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        Войти через Google и принять
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
        {pending ? 'Принимаю...' : 'Принять приглашение'}
      </button>
      {error && (
        <p className="text-sm text-red-600 mt-3">
          {error === 'invitation_invalid_or_expired'
            ? 'Ссылка недействительна или истёк срок. Попроси прислать новую.'
            : error === 'unauthorized'
              ? 'Войди заново и попробуй снова.'
              : `Ошибка: ${error}`}
        </p>
      )}
      <p className="text-xs text-(--color-muted) mt-4">
        После принятия, возможно, потребуется один раз выйти и зайти заново,
        чтобы новая община появилась в твоих ролях.
      </p>
    </div>
  );
}
