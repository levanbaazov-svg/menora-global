'use client';

import { useActionState, useOptimistic, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { bookmarkItem, unbookmarkItem } from './_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';

export function BookmarkButton({
  slug,
  initiallyBookmarked,
  size = 'md',
}: {
  slug: string;
  initiallyBookmarked: boolean;
  size?: 'sm' | 'md';
}) {
  const t = useTranslations('engageMisc');
  const [optimisticBookmarked, setOptimistic] = useOptimistic(initiallyBookmarked);
  const [_state, action] = useActionState(
    optimisticBookmarked ? unbookmarkItem : bookmarkItem,
    INITIAL_STATE,
  );

  const sizeClass = size === 'sm' ? 'h-8 w-8 text-base' : 'h-10 w-10 text-lg';

  return (
    <form
      action={(fd) => {
        startTransition(() => setOptimistic(!optimisticBookmarked));
        action(fd);
      }}
      className="inline"
    >
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        aria-label={optimisticBookmarked ? t('inspire.removeBookmark') : t('inspire.addBookmark')}
        title={optimisticBookmarked ? t('inspire.removeBookmark') : t('inspire.addBookmark')}
        className={`${sizeClass} inline-flex items-center justify-center rounded-full border transition-all ${
          optimisticBookmarked
            ? 'bg-(--color-gold-soft) border-(--color-gold)/40 text-(--color-gold-dark)'
            : 'bg-(--color-bg-elevated) border-(--color-border) text-(--color-fg-muted) hover:border-(--color-gold)/40 hover:text-(--color-deep)'
        }`}
      >
        {optimisticBookmarked ? '★' : '☆'}
      </button>
    </form>
  );
}
