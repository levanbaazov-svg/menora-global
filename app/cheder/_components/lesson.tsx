'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, PartyPopper, RotateCcw, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRebbe } from './rebbe';

export function LessonShell({
  chip,
  title,
  hebrewTitle,
  subtitle,
  accent,
  intro,
  children,
}: {
  chip: string;
  title: string;
  hebrewTitle?: string;
  subtitle?: string;
  accent?: { main: string; soft: string };
  intro?: string;
  children: React.ReactNode;
}) {
  const a = accent ?? { main: 'var(--ch-blue)', soft: 'var(--ch-blue-soft)' };
  const { say } = useRebbe();
  const introSaid = React.useRef(false);
  React.useEffect(() => {
    if (intro && !introSaid.current) {
      introSaid.current = true;
      say(intro);
    }
  }, [intro, say]);
  return (
    <div className="py-6">
      <Link
        href="/cheder/today"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> My day
      </Link>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ backgroundColor: a.soft, color: a.main }}>
            {chip}
          </span>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {hebrewTitle && (
          <p dir="rtl" className="shrink-0 pt-7 text-2xl font-semibold" style={{ color: a.main }}>
            {hebrewTitle}
          </p>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function CompletionCard({
  reward,
  alreadyDone,
  message,
  onFinish,
}: {
  reward: number;
  alreadyDone: boolean;
  message: string;
  onFinish: () => void;
}) {
  return (
    <div className="rounded-3xl border border-[var(--ch-green)]/40 bg-[var(--ch-green-soft)] p-6 text-center">
      <PartyPopper className="mx-auto size-8 text-[var(--ch-green)]" />
      <p className="mt-3 font-serif text-xl font-semibold">{message}</p>
      {!alreadyDone && (
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--ch-amber)]">
          +{reward} <Ticket className="size-4" /> tickets earned
        </p>
      )}
      <Button size="lg" className="mt-4 h-11 w-full rounded-2xl" onClick={onFinish}>
        Back to my day
      </Button>
    </div>
  );
}

export type QuizQuestion = {
  q: string;
  hebrew?: string;
  choices: string[];
  correct: number;
  explain?: string;
};

/**
 * Mastery quiz: wrong answers come back until answered right; mastery % is
 * first-try accuracy — the same ≥80% gate every unit in the school uses.
 */
export function MasteryQuiz({
  questions,
  onDone,
}: {
  questions: QuizQuestion[];
  onDone: (masteryPct: number) => void;
}) {
  const [queue, setQueue] = React.useState<number[]>(() => questions.map((_, i) => i));
  const [attempted, setAttempted] = React.useState<Set<number>>(new Set());
  const [firstTryRight, setFirstTryRight] = React.useState(0);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [solved, setSolved] = React.useState(0);

  const idx = queue[0];
  const question = idx === undefined ? null : questions[idx];
  const total = questions.length;
  const masteryPct = Math.round((firstTryRight / total) * 100);

  if (!question) {
    const mastered = masteryPct >= 80;
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">First-try mastery</p>
        <p
          className={cn(
            'mt-1 font-serif text-5xl font-semibold',
            mastered ? 'text-[var(--ch-green)]' : 'text-muted-foreground',
          )}
        >
          {masteryPct}%
        </p>
        <div className="mx-auto mt-3 h-2 w-48 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full', mastered ? 'bg-[var(--ch-green)]' : 'bg-muted-foreground/40')}
            style={{ width: `${masteryPct}%` }}
          />
        </div>
        {mastered ? (
          <Button size="lg" className="mt-5 h-11 w-full rounded-2xl" onClick={() => onDone(masteryPct)}>
            <Check className="size-4" /> Unit mastered — continue
          </Button>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              The gate is 80%. No rush — review and try again. Nobody moves on half-sure.
            </p>
            <Button
              size="lg"
              variant="outline"
              className="mt-4 h-11 w-full rounded-2xl"
              onClick={() => {
                setQueue(questions.map((_, i) => i));
                setAttempted(new Set());
                setFirstTryRight(0);
                setSolved(0);
                setPicked(null);
              }}
            >
              <RotateCcw className="size-4" /> Try again
            </Button>
          </>
        )}
      </div>
    );
  }

  const answered = picked !== null;
  const isRight = answered && picked === question.correct;

  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          Check · {Math.min(solved + 1, total)} of {total}
        </span>
        <span className="tabular-nums">{Math.round((solved / total) * 100)}%</span>
      </div>
      <p className="mt-3 text-lg font-medium">{question.q}</p>
      {question.hebrew && (
        <p dir="rtl" className="mt-1 text-2xl text-accent-foreground">
          {question.hebrew}
        </p>
      )}
      <div className="mt-4 space-y-2">
        {question.choices.map((choice, i) => (
          <button
            key={choice}
            type="button"
            disabled={answered}
            onClick={() => {
              setPicked(i);
              const first = !attempted.has(idx);
              if (first) setAttempted((s) => new Set(s).add(idx));
              if (i === question.correct && first) setFirstTryRight((n) => n + 1);
            }}
            className={cn(
              'w-full rounded-2xl border px-4 py-3 text-left text-[0.95rem] font-medium transition-colors',
              !answered && 'border-border bg-background hover:bg-muted',
              answered && i === question.correct && 'border-[var(--ch-green)]/50 bg-[var(--ch-green-soft)] text-[var(--ch-green)]',
              answered && picked === i && i !== question.correct &&
                'border-destructive/40 bg-destructive/10 text-destructive',
              answered && picked !== i && i !== question.correct && 'border-border opacity-50',
            )}
          >
            {choice}
          </button>
        ))}
      </div>
      {answered && (
        <div className="mt-4">
          {isRight ? (
            <p className="text-sm font-medium text-[var(--ch-green)]">
              {question.explain ?? 'Exactly right.'}
            </p>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">
              Not yet — this one will come back until it&apos;s yours.
            </p>
          )}
          <Button
            size="lg"
            className="mt-3 h-11 w-full rounded-2xl"
            onClick={() => {
              setPicked(null);
              if (isRight) {
                setSolved((n) => n + 1);
                setQueue((q) => q.slice(1));
              } else {
                setQueue((q) => [...q.slice(1), q[0]]);
              }
            }}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
