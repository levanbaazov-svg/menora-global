'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, MessageCircleQuestion, Play, Radio, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRebbe } from '../../_components/rebbe';
import { roomById, RoomVignette } from '../../_components/rooms';
import { useCheder } from '../../_components/state';

const AVATARS: Record<string, string> = {
  'Rabbi K.': 'var(--ch-blue)',
  'Ms. Gold': 'var(--ch-teal)',
  Levi: 'var(--ch-green)',
  Mendy: 'var(--ch-violet)',
  Sholom: 'var(--ch-rose)',
  Zalmy: 'var(--ch-amber)',
};

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, child } = useCheder();
  const { say } = useRebbe();
  const room = roomById(params.id);
  const [messages, setMessages] = React.useState(room?.board ?? []);
  const [draft, setDraft] = React.useState('');
  const greeted = React.useRef(false);

  React.useEffect(() => {
    if (ready && !child) router.replace('/cheder');
  }, [ready, child, router]);

  React.useEffect(() => {
    if (room && !greeted.current) {
      greeted.current = true;
      say(room.rebbeLine);
    }
  }, [room, say]);

  if (!room) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        This room does not exist. <Link href="/cheder/school" className="font-semibold underline">Back to school</Link>
      </div>
    );
  }
  if (!ready || !child) return <div className="py-10" />;

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: child.name, text }]);
    setDraft('');
  };

  return (
    <div className="py-6">
      <Link
        href="/cheder/school"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> My school
      </Link>

      {/* room hero */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-border">
        <div className="relative px-5 pt-5 pb-2" style={{ backgroundColor: room.soft }}>
          <RoomVignette kind={room.vignette} main={room.main} />
          <div className="flex items-end justify-between gap-3 pb-2">
            <div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight">{room.name}</h1>
              <p className="mt-0.5 text-sm font-medium" style={{ color: room.main }}>
                {room.status}
              </p>
            </div>
            <p dir="rtl" className="shrink-0 font-serif text-2xl font-semibold" style={{ color: room.main }}>
              {room.he}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-card p-3">
          {room.cta && (
            <Button asChild size="sm" className="rounded-xl">
              <Link href={room.cta.href}>
                {room.cta.label} <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}
          {room.liveNote && (
            <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
              <Radio className="size-3.5" /> {room.liveNote}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="ml-auto rounded-xl"
            onClick={() => say(room.rebbeLine)}
          >
            <MessageCircleQuestion className="size-4" /> Ask the Rebbi
          </Button>
        </div>
      </div>

      {/* class board */}
      {room.board.length > 0 && (
        <div className="mt-4 rounded-3xl border border-border bg-card p-5">
          <p className="font-serif text-lg font-semibold">Class board</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Talk it through with your class — the rebbi reads everything here.
          </p>
          <div className="mt-3 space-y-2.5">
            {messages.map((m, i) => {
              const mine = m.from === child.name;
              const color = AVATARS[m.from] ?? 'var(--ch-sky)';
              return (
                <div key={i} className={mine ? 'flex flex-row-reverse items-start gap-2' : 'flex items-start gap-2'}>
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: mine ? 'var(--ch-blue)' : color }}
                  >
                    {m.from.slice(0, 1)}
                  </span>
                  <div
                    className="max-w-[80%] rounded-2xl border border-border px-3 py-2"
                    style={mine ? { backgroundColor: 'var(--ch-blue-soft)' } : { backgroundColor: 'var(--muted)' }}
                  >
                    <p className="text-[0.65rem] font-bold text-muted-foreground">{m.from}</p>
                    <p className="text-sm">{m.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Say it to the class…"
              className="h-10 rounded-xl"
            />
            <Button size="sm" className="h-10 rounded-xl px-3" onClick={send} aria-label="Send">
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* shelf */}
      {room.shelf.length > 0 && (
        <div className="mt-4 rounded-3xl border border-border bg-card p-5">
          <p className="font-serif text-lg font-semibold">On the shelf</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Extra treasures for curious heads</p>
          <div className="mt-3 space-y-2">
            {room.shelf.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => say('This shelf opens fully in the pilot — for now, ask me at the shiur!')}
                className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted"
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: room.soft, color: room.main }}
                >
                  {item.includes('audio') ? <Play className="size-4" /> : <BookOpen className="size-4" />}
                </span>
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
