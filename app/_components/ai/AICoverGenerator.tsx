'use client';

// AI cover-image generator for the new-event form.
// On click: POST to /api/ai/generate-cover, get a base64 PNG data URL,
// stuff it into a hidden input (so it lands in `cover_image_url` on submit)
// and preview it inline.

import { useCallback, useState } from 'react';
import type { RefObject } from 'react';

interface Props {
  /** Ref to the form's title input — we read its value when generating. */
  titleRef: RefObject<HTMLInputElement | null>;
  /** Ref to the form's type select (optional). */
  typeRef?: RefObject<HTMLSelectElement | null>;
  /** Ref to the form's description textarea (optional). */
  descriptionRef?: RefObject<HTMLTextAreaElement | null>;
  /** Pre-existing cover URL to show before user generates */
  initialUrl?: string;
  /** Community city for richer prompts */
  communityCity?: string;
}

export function AICoverGenerator({
  titleRef, typeRef, descriptionRef, initialUrl, communityCity,
}: Props) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onClick = useCallback(async () => {
    const title = titleRef.current?.value?.trim();
    if (!title || title.length < 2) {
      setError('Сначала введи название события');
      setState('error');
      setTimeout(() => setState('idle'), 4000);
      return;
    }

    setState('loading');
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type: typeRef?.current?.value,
          description: descriptionRef?.current?.value?.slice(0, 600),
          community_city: communityCity,
        }),
      });
      const json: { ok: boolean; dataUrl?: string; error?: string } = await res.json();
      if (!json.ok || !json.dataUrl) {
        setError(json.error ?? 'AI вернул ошибку');
        setState('error');
        setTimeout(() => setState('idle'), 5000);
        return;
      }
      setPreview(json.dataUrl);
      setState('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Сеть');
      setState('error');
      setTimeout(() => setState('idle'), 5000);
    }
  }, [titleRef, typeRef, descriptionRef, communityCity]);

  const clear = () => {
    setPreview(null);
    setState('idle');
    setError(null);
  };

  return (
    <div className="space-y-3">
      {/* Hidden field so the URL/data-URL lands in the form payload */}
      <input type="hidden" name="cover_image_url" value={preview ?? ''} />

      {/* Preview / placeholder */}
      <div className="relative rounded-2xl overflow-hidden border border-(--color-border)/60 bg-(--color-bg-muted) aspect-[3/2]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Cover preview" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-(--color-fg-muted)">
            <div className="text-4xl mb-2 opacity-50">🖼</div>
            <div className="text-xs">Обложка появится здесь</div>
          </div>
        )}
        {state === 'loading' && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center text-white">
            <div className="w-8 h-8 border-3 border-white border-r-transparent rounded-full animate-spin mb-3" />
            <div className="text-sm font-medium">AI рисует обложку...</div>
            <div className="text-xs opacity-80 mt-1">~15 секунд</div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onClick}
          disabled={state === 'loading'}
          className="
            inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold
            bg-(--color-gold) text-(--color-deep) shadow-[var(--shadow-gold)]
            hover:opacity-95 hover:shadow-[var(--shadow-md)]
            active:scale-[0.98]
            transition-all duration-200
            disabled:opacity-50 disabled:pointer-events-none
          "
        >
          ✨ {preview ? 'Сгенерировать ещё раз' : 'Сгенерировать обложку с AI'}
        </button>
        {preview && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-(--color-fg-muted) hover:text-(--color-deep) transition-colors px-2 py-1"
          >
            Убрать
          </button>
        )}
        {state === 'error' && error && (
          <span className="text-xs text-(--color-danger) flex-1">{error}</span>
        )}
      </div>
    </div>
  );
}
