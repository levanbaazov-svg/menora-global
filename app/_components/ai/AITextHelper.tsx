'use client';

// Inline AI text improver for descriptions in create-X forms.
//
// Usage:
//   const ref = useRef<HTMLTextAreaElement>(null);
//   <Textarea name="description" ref={ref} ... />
//   <AITextHelper targetRef={ref} kind="program" hint={{ name: titleValue }} />

import { useCallback, useState } from 'react';
import type { RefObject } from 'react';
import { useTranslations } from 'next-intl';

type ContentKind =
  | 'place_synagogue' | 'place_restaurant' | 'place_cafe' | 'place_store' | 'place_generic'
  | 'program' | 'group' | 'event';

interface Props {
  /** Ref to the textarea whose value we'll improve in place. */
  targetRef: RefObject<HTMLTextAreaElement | null>;
  kind: ContentKind;
  hint?: { name?: string; communityName?: string };
}

export function AITextHelper({ targetRef, kind, hint }: Props) {
  const t = useTranslations('aiPublic');
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onClick = useCallback(async () => {
    const el = targetRef.current;
    if (!el) return;

    const draft = el.value.trim();
    if (draft.length < 3) {
      setError(t('textHelper.needDraft'));
      setState('error');
      setTimeout(() => setState('idle'), 4000);
      return;
    }

    setState('loading');
    setError(null);
    try {
      const res = await fetch('/api/ai/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft,
          kind,
          name: hint?.name,
          community_name: hint?.communityName,
        }),
      });
      const json: { ok: boolean; text?: string; error?: string } = await res.json();
      if (!json.ok || !json.text) {
        setError(json.error ?? t('textHelper.aiError'));
        setState('error');
        setTimeout(() => setState('idle'), 5000);
        return;
      }
      // Replace textarea value + fire React's controlled-input event so any
      // state listeners pick it up.
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value',
      )?.set;
      setter?.call(el, json.text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.focus();
      setState('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('textHelper.network'));
      setState('error');
      setTimeout(() => setState('idle'), 5000);
    }
  }, [kind, hint?.name, hint?.communityName, targetRef, t]);

  return (
    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={onClick}
        disabled={state === 'loading'}
        className="
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
          text-xs font-semibold
          bg-(--color-gold-soft) text-(--color-gold-dark) border border-(--color-gold)/30
          hover:bg-(--color-gold)/20 hover:border-(--color-gold)/50
          active:scale-[0.97]
          transition-all duration-200
          disabled:opacity-50 disabled:pointer-events-none
        "
      >
        {state === 'loading' ? (
          <>
            <span className="w-3 h-3 border-2 border-current border-r-transparent rounded-full animate-spin" />
            {t('textHelper.writing')}
          </>
        ) : (
          <>✨ {t('textHelper.improve')}</>
        )}
      </button>
      {state === 'error' && error && (
        <span className="text-xs text-(--color-danger)">{error}</span>
      )}
    </div>
  );
}
