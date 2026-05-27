'use server';

// Inspiration: bookmark / unbookmark server actions.

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { z } from 'zod';
import { type ActionState } from '@/lib/onboarding/action-state';
import { getItemBySlug } from '@/lib/inspiration/library';

const INSERT_BOOKMARK = /* GraphQL */ `
  mutation InsertBookmark($obj: inspiration_bookmarks_insert_input!) {
    insert_inspiration_bookmarks_one(
      object: $obj
      on_conflict: {
        constraint: inspiration_bookmarks_unique
        update_columns: []
      }
    ) { id }
  }
`;

const DELETE_BOOKMARK = /* GraphQL */ `
  mutation DeleteBookmark($user_id: uuid!, $item_slug: String!) {
    delete_inspiration_bookmarks(
      where: {
        user_id: { _eq: $user_id }
        item_slug: { _eq: $item_slug }
      }
    ) { affected_rows }
  }
`;

const schema = z.object({ slug: z.string().min(1).max(120) });

export async function bookmarkItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { formError: 'Не авторизован' };

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { formError: 'Неверные данные' };

  const item = getItemBySlug(parsed.data.slug);
  if (!item) return { formError: 'Материал не найден' };

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  try {
    await client.request(INSERT_BOOKMARK, {
      obj: {
        user_id: session.user.id,
        item_slug: item.slug,
        item_kind: item.kind,
      },
    });
    revalidatePath(`/dashboard/inspire/${item.slug}`);
    revalidatePath('/dashboard/inspire');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}

export async function unbookmarkItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { formError: 'Не авторизован' };

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { formError: 'Неверные данные' };

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  try {
    await client.request(DELETE_BOOKMARK, {
      user_id: session.user.id,
      item_slug: parsed.data.slug,
    });
    revalidatePath(`/dashboard/inspire/${parsed.data.slug}`);
    revalidatePath('/dashboard/inspire');
    return { ok: true };
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Ошибка' };
  }
}
