'use server';

// Jewish ID: regenerate token, toggle enabled.

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { regenerateToken, setEnabled } from '@/lib/jewish-id';
import { type ActionState } from '@/lib/onboarding/action-state';

export async function regenerateJewishIdToken(
  _prev: ActionState, _formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { formError: 'Не авторизован' };

  try {
    await regenerateToken(session.user.id);
    revalidatePath('/dashboard/me/jewish-id');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

export async function toggleJewishIdEnabled(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { formError: 'Не авторизован' };

  const enabled = formData.get('enabled') === 'true';
  try {
    await setEnabled(session.user.id, enabled);
    revalidatePath('/dashboard/me/jewish-id');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}
