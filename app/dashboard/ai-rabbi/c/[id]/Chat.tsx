'use client';

// Streaming chat surface. Wraps @ai-sdk/react useChat against our /api/ai/chat route.
// Receives initialMessages from server (persisted history) so refreshes don't lose state.

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';

interface InitialMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: Array<{ type: 'text'; text: string }>;
}

interface Props {
  conversationId: string;
  scenarioTitle: string;
  scenarioEmoji: string;
  scenarioTint: string;
  examplePrompts: string[];
  initialMessages: InitialMessage[];
}

export function Chat({
  conversationId,
  scenarioTitle,
  scenarioEmoji,
  scenarioTint,
  examplePrompts,
  initialMessages,
}: Props) {
  // useChat is the single source of truth for the message list once mounted.
  // We hydrate it with the server-rendered history.
  const { messages, sendMessage, status, error, stop } = useChat({
    id: conversationId,
    messages: initialMessages as unknown as UIMessage[],
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      // Pass conversation_id alongside the messages in the request body.
      prepareSendMessagesRequest: ({ messages, id }) => ({
        body: { conversation_id: id, messages },
      }),
    }),
  });

  // Local input state — we don't use useChat's built-in input (deprecated in v6).
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new tokens.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, status]);

  const isStreaming = status === 'submitted' || status === 'streaming';
  const isDisabled = isStreaming;
  // Show example prompts only on a brand-new conversation (just the opener visible).
  const showSuggestions = messages.length <= 1 && !isStreaming;

  function send(text: string) {
    if (!text.trim()) return;
    setInput('');
    sendMessage({ text });
    // Re-focus textarea for fast follow-ups
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter to send; Shift+Enter for newline (desktop convention).
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function handleSuggestionClick(p: string) {
    send(p);
  }

  return (
    <>
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto -mx-5 md:mx-0 px-5 md:px-0 py-4 space-y-4"
      >
        {messages.map((m) => (
          <Bubble
            key={m.id}
            role={m.role as 'user' | 'assistant'}
            text={messageText(m)}
            scenarioEmoji={scenarioEmoji}
            scenarioTint={scenarioTint}
          />
        ))}

        {/* Pending indicator while streaming has no text yet */}
        {isStreaming && lastMessageRole(messages) === 'user' && (
          <Bubble
            role="assistant"
            text=""
            scenarioEmoji={scenarioEmoji}
            scenarioTint={scenarioTint}
            typing
          />
        )}

        {/* Suggestions */}
        {showSuggestions && (
          <div className="pt-2">
            <div className="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-2">
              Можешь спросить:
            </div>
            <div className="flex flex-col gap-2 max-w-md">
              {examplePrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSuggestionClick(p)}
                  className="text-left text-sm rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 px-4 py-2.5 hover:border-(--color-gold)/40 hover:bg-(--color-muted-bg)/50 transition-colors"
                >
                  «{p}»
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            <div className="font-medium mb-1">Не получилось</div>
            <div className="text-xs">{error.message}</div>
          </div>
        )}
      </div>

      {/* Input bar — sticky bottom */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 -mx-5 md:mx-0 px-5 md:px-0 pt-3 pb-3 bg-gradient-to-t from-(--color-bg-base) via-(--color-bg-base) to-transparent"
      >
        <div className="flex items-end gap-2 rounded-3xl bg-(--color-bg-elevated) border border-(--color-border)/60 p-2 focus-within:border-(--color-gold)/60 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Спросить про ${scenarioTitle.toLowerCase()}...`}
            rows={1}
            disabled={isDisabled}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-(--color-fg-muted) max-h-32 disabled:opacity-50"
            style={{ minHeight: '40px' }}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="shrink-0 w-10 h-10 rounded-full bg-(--color-fg-muted) text-white flex items-center justify-center hover:opacity-90"
              aria-label="Остановить"
            >
              ⏸
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="shrink-0 w-10 h-10 rounded-full bg-(--color-deep) text-white flex items-center justify-center hover:opacity-90 disabled:opacity-30 transition-opacity"
              aria-label="Отправить"
            >
              ↑
            </button>
          )}
        </div>
        <div className="text-[10px] text-(--color-fg-subtle) mt-1.5 px-1">
          AI Раввин может ошибаться — по галахическим вопросам сверяйся с местным раввином.
        </div>
      </form>
    </>
  );
}

// ── Bubble ──────────────────────────────────────────────────────────────────
function Bubble({
  role,
  text,
  scenarioEmoji,
  scenarioTint,
  typing,
}: {
  role: 'user' | 'assistant';
  text: string;
  scenarioEmoji: string;
  scenarioTint: string;
  typing?: boolean;
}) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl rounded-br-md bg-(--color-deep) text-white px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <div
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-base"
        style={{ background: scenarioTint }}
      >
        {scenarioEmoji}
      </div>
      <div className="max-w-[85%] rounded-3xl rounded-bl-md bg-(--color-bg-elevated) border border-(--color-border)/60 px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed">
        {typing ? <TypingDots /> : text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 items-center py-1">
      <Dot delay="0s" />
      <Dot delay="0.15s" />
      <Dot delay="0.3s" />
    </span>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-(--color-fg-muted) inline-block"
      style={{
        animation: 'pulse 1.2s ease-in-out infinite',
        animationDelay: delay,
      }}
    />
  );
}

// ── helpers ────────────────────────────────────────────────────────────────
function messageText(m: UIMessage): string {
  if (!m.parts) return '';
  return m.parts.map((p) => (p.type === 'text' ? p.text : '')).join('');
}

function lastMessageRole(messages: UIMessage[]): 'user' | 'assistant' | null {
  const last = messages[messages.length - 1];
  if (!last) return null;
  return (last.role as 'user' | 'assistant') ?? null;
}
