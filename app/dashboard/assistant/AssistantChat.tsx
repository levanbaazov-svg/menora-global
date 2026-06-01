'use client';

// Rabbi assistant chat surface — text + voice input + tool-call visibility.
//
// Unlike AI Rabbi (deliberate slow chat), this is for action: each turn can
// trigger multiple tool calls. We render tool invocations inline so the rabbi
// sees what the AI is doing on their behalf.

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { VoiceInput } from './VoiceInput';

interface Props {
  rabbiName: string | null;
  communityName: string | null;
  starterPrompts: string[];
}

export function AssistantChat({ rabbiName, communityName, starterPrompts }: Props) {
  const t = useTranslations('aiPublic');
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/assistant',
      prepareSendMessagesRequest: ({ messages }) => ({ body: { messages } }),
    }),
  });

  const [input, setInput] = useState('');
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, status]);

  const isStreaming = status === 'submitted' || status === 'streaming';
  const showSuggestions = messages.length === 0 && !isStreaming;

  function send(text: string) {
    const t = text.trim();
    if (!t) return;
    setInput('');
    sendMessage({ text: t });
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function handleVoice(text: string, isFinal: boolean) {
    setInput(text);
    if (isFinal && text.trim().length > 0) {
      // Auto-submit on speech end
      send(text);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] md:h-[calc(100vh-7rem)]">
      {/* Messages scroll area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto -mx-5 md:mx-0 px-5 md:px-0 py-4 space-y-4"
      >
        {/* Welcome on empty state */}
        {messages.length === 0 && (
          <div className="text-center py-8 fade-up">
            <div className="text-5xl mb-3 inline-block float">✦</div>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-2 leading-tight">
              {t('assistant.welcomeTitle', { name: rabbiName ?? t('assistant.welcomeNamefallback') })}
            </h2>
            <p className="text-sm text-(--color-fg-muted) max-w-md mx-auto">
              {t('assistant.welcomeSubtitle')}
            </p>
            {voiceSupported === false && (
              <p className="text-[11px] text-(--color-warning) mt-3">
                {t('assistant.voiceUnsupported')}
              </p>
            )}
          </div>
        )}

        {messages.map((m) => (
          <MessageBlock key={m.id} message={m} communityName={communityName} />
        ))}

        {isStreaming && lastRoleIs(messages, 'user') && (
          <ThinkingBubble />
        )}

        {showSuggestions && starterPrompts.length > 0 && (
          <div className="pt-2 max-w-md mx-auto">
            <div className="text-[10px] uppercase tracking-widest text-(--color-fg-muted) mb-3 text-center">
              {t('assistant.suggestionsLabel')}
            </div>
            <div className="space-y-2">
              {starterPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="block w-full text-left text-sm rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 px-4 py-2.5 hover:border-(--color-gold)/40 hover:bg-(--color-muted-bg)/50 transition-colors"
                >
                  «{p}»
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-(--color-danger-soft) border border-(--color-danger)/30 text-(--color-danger) px-4 py-3 text-sm">
            <div className="font-medium mb-1">{t('assistant.errorTitle')}</div>
            <div className="text-xs">{error.message}</div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 -mx-5 md:mx-0 px-5 md:px-0 pt-3 pb-3 bg-gradient-to-t from-(--color-bg) via-(--color-bg) to-transparent"
      >
        <div className="flex items-end gap-3">
          <VoiceInput
            onTranscript={handleVoice}
            onSupportDetected={setVoiceSupported}
          />
          <div className="flex-1 flex items-end gap-2 rounded-3xl bg-(--color-bg-elevated) border border-(--color-border)/60 p-2 focus-within:border-(--color-gold)/60 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('assistant.inputPlaceholder')}
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-(--color-fg-subtle) max-h-32 disabled:opacity-50"
              style={{ minHeight: '40px' }}
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={stop}
                className="shrink-0 w-10 h-10 rounded-full bg-(--color-fg-muted) text-white flex items-center justify-center hover:opacity-90"
                aria-label={t('assistant.stop')}
              >
                ⏸
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="shrink-0 w-10 h-10 rounded-full bg-(--color-deep) text-white flex items-center justify-center hover:opacity-90 disabled:opacity-30 transition-opacity"
                aria-label={t('assistant.send')}
              >
                ↑
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Message rendering ────────────────────────────────────────────────────
function MessageBlock({ message, communityName }: { message: UIMessage; communityName: string | null }) {
  if (message.role === 'user') {
    const text = (message.parts ?? [])
      .map((p) => (p.type === 'text' ? p.text : ''))
      .join('');
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl rounded-br-md bg-(--color-deep) text-white px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed">
          {text}
        </div>
      </div>
    );
  }

  // Assistant message: walk parts to render text + tool calls inline.
  return (
    <div className="flex items-start gap-2">
      <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-base bg-(--color-gold-soft)">
        ✦
      </div>
      <div className="flex-1 max-w-[85%] space-y-2">
        {(message.parts ?? []).map((part, i) => {
          if (part.type === 'text') {
            const text = part.text.trim();
            if (!text) return null;
            return (
              <div
                key={i}
                className="rounded-3xl rounded-bl-md bg-(--color-bg-elevated) border border-(--color-border)/60 px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed"
              >
                {renderMarkdownLite(text)}
              </div>
            );
          }
          // Tool calls appear as `tool-${name}` part types in AI SDK v6.
          if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
            const toolName = part.type.slice(5);
            const state = (part as { state?: string }).state;
            const args = (part as { input?: unknown }).input;
            const out = (part as { output?: unknown }).output;
            return (
              <ToolCallCard
                key={i}
                toolName={toolName}
                state={state}
                input={args}
                output={out}
                communityName={communityName}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function ToolCallCard({
  toolName, state, input, output, communityName,
}: {
  toolName: string;
  state?: string;
  input: unknown;
  output: unknown;
  communityName: string | null;
}) {
  const t = useTranslations('aiPublic');
  const label = TOOL_KEYS.includes(toolName) ? t(`assistant.tools.${toolName}`) : toolName;
  const running = state === 'input-streaming' || state === 'input-available';

  return (
    <details
      open={!!output}
      className="rounded-2xl bg-(--color-gold-soft)/40 border border-(--color-gold)/30 px-3 py-2 text-xs"
    >
      <summary className="cursor-pointer flex items-center gap-2 text-(--color-gold-dark) font-semibold">
        {running ? (
          <span className="w-3 h-3 border-2 border-current border-r-transparent rounded-full animate-spin" />
        ) : (
          <span>⚙️</span>
        )}
        <span>{label}</span>
        <span className="text-(--color-fg-muted) text-[10px] font-normal ml-auto">
          {running ? t('assistant.toolRunning') : t('assistant.toolDone')}
        </span>
      </summary>
      <ToolResultRenderer toolName={toolName} input={input} output={output} communityName={communityName} />
    </details>
  );
}

const TOOL_KEYS = [
  'lookup_member', 'get_member_summary', 'add_member_note', 'add_task',
  'list_tasks', 'complete_task', 'get_upcoming_events', 'get_pending_requests',
  'community_stats', 'birthdays_in_next_week', 'send_notification_to_member',
  'google_calendar_quick_add',
];

function ToolResultRenderer({
  toolName, input, output,
}: {
  toolName: string;
  input: unknown;
  output: unknown;
  communityName: string | null;
}) {
  const t = useTranslations('aiPublic');
  if (!output) {
    if (input && typeof input === 'object') {
      return (
        <div className="mt-2 text-(--color-fg-muted) leading-relaxed">
          {Object.entries(input as Record<string, unknown>).map(([k, v]) => (
            <div key={k}>
              <span className="text-(--color-fg-subtle)">{k}:</span>{' '}
              <span>{String(v).slice(0, 80)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  }

  // Member list
  if (toolName === 'lookup_member' && Array.isArray(output)) {
    if (output.length === 0) return <div className="mt-2 text-(--color-fg-muted)">{t('assistant.lookupEmpty')}</div>;
    return (
      <div className="mt-2 space-y-1.5">
        {output.map((m: Record<string, unknown>) => (
          <div key={String(m.user_id)} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/60">
            <div className="font-medium text-(--color-fg)">{String(m.name ?? '—')}</div>
            {Boolean(m.hebrew_name) && (
              <div className="text-(--color-fg-muted)" dir="rtl" lang="he">{String(m.hebrew_name)}</div>
            )}
            <div className="text-[10px] uppercase tracking-wider text-(--color-fg-subtle) ml-auto">{String(m.role)}</div>
          </div>
        ))}
      </div>
    );
  }

  if (toolName === 'add_task' && output && typeof output === 'object') {
    const o = output as Record<string, unknown>;
    return (
      <div className="mt-2 p-2 rounded bg-white/60">
        <div className="font-semibold text-(--color-fg)">📝 {String(o.title ?? '')}</div>
        {o.due_date != null && (
          <div className="text-[11px] text-(--color-fg-muted) mt-0.5">
            {t('assistant.taskDue', { date: String(o.due_date) })}
          </div>
        )}
      </div>
    );
  }

  if (toolName === 'community_stats' && output && typeof output === 'object') {
    const o = output as Record<string, number>;
    return (
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
        {Object.entries(o).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-(--color-fg-muted)">{k.replace(/_/g, ' ')}</dt>
            <dd className="text-(--color-fg) font-semibold text-right">{String(v)}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (toolName === 'google_calendar_quick_add' && output && typeof output === 'object') {
    const url = (output as { url?: string }).url;
    if (!url) return null;
    return (
      <div className="mt-2">
        <a
          href={url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-(--color-deep) text-white font-medium hover:opacity-90"
        >
          {t('assistant.openGoogleCalendar')}
        </a>
      </div>
    );
  }

  // Generic fallback — pretty JSON
  return (
    <pre className="mt-2 text-(--color-fg-muted) leading-relaxed overflow-x-auto max-h-40">
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-2">
      <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-base bg-(--color-gold-soft)">
        ✦
      </div>
      <div className="rounded-3xl rounded-bl-md bg-(--color-bg-elevated) border border-(--color-border)/60 px-4 py-2.5 text-sm">
        <span className="inline-flex gap-1 items-center py-1">
          <Dot delay="0s" />
          <Dot delay="0.15s" />
          <Dot delay="0.3s" />
        </span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-(--color-fg-muted) inline-block"
      style={{ animation: 'pulse 1.2s ease-in-out infinite', animationDelay: delay }}
    />
  );
}

function lastRoleIs(messages: UIMessage[], role: 'user' | 'assistant'): boolean {
  const last = messages[messages.length - 1];
  return last?.role === role;
}

// Minimal markdown: **bold**, [text](url), \n
function renderMarkdownLite(text: string): React.ReactNode {
  // Split into lines, then inline-format each.
  return text.split('\n').map((line, i) => {
    const segments: React.ReactNode[] = [];
    const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/g;
    const boldRe = /\*\*([^*]+)\*\*/g;
    let rest = line;
    let key = 0;

    while (rest.length > 0) {
      const link = linkRe.exec(rest);
      const bold = boldRe.exec(rest);
      const first = [link, bold].filter(Boolean).sort((a, b) => (a!.index - b!.index))[0];
      if (!first) {
        segments.push(<span key={key++}>{rest}</span>);
        break;
      }
      if (first.index > 0) segments.push(<span key={key++}>{rest.slice(0, first.index)}</span>);
      if (first[0].startsWith('[')) {
        segments.push(<a key={key++} href={first[2]} target="_blank" rel="noopener noreferrer" className="text-(--color-gold-dark) underline hover:opacity-80">{first[1]}</a>);
      } else {
        segments.push(<strong key={key++} className="font-semibold">{first[1]}</strong>);
      }
      rest = rest.slice(first.index + first[0].length);
      linkRe.lastIndex = 0;
      boldRe.lastIndex = 0;
    }

    return (
      <span key={i}>
        {segments}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    );
  });
}
