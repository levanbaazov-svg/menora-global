'use client';

// Free-chat bar on the dashboard home. Rendered in-flow at the bottom of the
// home column (the page pins it there with mt-auto), so it sits just above the
// Liquid Glass tab bar without leaving an empty gap when content is short.
// Submitting opens a fresh "open" AI Rabbi conversation with the question sent.

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, ArrowUp, Loader2 } from 'lucide-react';
import { askRabbiFromHome } from '@/app/dashboard/ai-rabbi/_actions';

export function HomeAskBar() {
  const t = useTranslations('home');
  const [text, setText] = useState('');
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || pending) return;
    startTransition(async () => {
      await askRabbiFromHome(t);
    });
  }

  return (
    <div>
      <form onSubmit={submit} className="mx-auto max-w-xl">
        <div
          className="
            flex items-center gap-2 rounded-full pl-3.5 pr-1.5 py-1.5
            bg-white/80 dark:bg-black/50
            border border-white/60
            shadow-[0_8px_28px_-6px_rgba(20,24,31,0.20),0_1px_4px_rgba(20,24,31,0.06)]
            backdrop-blur-[28px] backdrop-saturate-[180%]
            focus-within:border-primary/50 transition-colors
          "
        >
          <Sparkles size={17} strokeWidth={2} className="shrink-0 text-primary" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('askPlaceholder')}
            disabled={pending}
            enterKeyHint="send"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/45 disabled:opacity-60 py-1.5"
          />
          <button
            type="submit"
            disabled={!text.trim() || pending}
            aria-label={t('ask')}
            className="shrink-0 w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 disabled:opacity-30 transition-opacity"
          >
            {pending
              ? <Loader2 size={16} strokeWidth={2.4} className="animate-spin" />
              : <ArrowUp size={16} strokeWidth={2.6} />}
          </button>
        </div>
      </form>
    </div>
  );
}
