'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Flame, Ticket, Timer, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LessonShell } from '../../_components/lesson';
import { useCheder } from '../../_components/state';

const ROUND_SECONDS = 60;

type Question = { text: string; answer: number; choices: number[] };

function rand(n: number): number {
  return Math.floor(Math.random() * n);
}

function makeQuestion(level: number): Question {
  let a: number, b: number, answer: number, text: string;
  if (level <= 1) {
    a = 2 + rand(8); b = 1 + rand(8); answer = a + b; text = `${a} + ${b}`;
  } else if (level === 2) {
    a = 10 + rand(20); b = 5 + rand(15);
    if (rand(2) === 0) { answer = a + b; text = `${a} + ${b}`; }
    else { answer = a; text = `${a + b} − ${b}`; }
  } else if (level === 3) {
    a = 2 + rand(8); b = 2 + rand(8); answer = a * b; text = `${a} × ${b}`;
  } else {
    a = 2 + rand(8); b = 2 + rand(8);
    if (rand(2) === 0) { answer = a * b; text = `${a} × ${b}`; }
    else { answer = b; text = `${a * b} ÷ ${a}`; }
  }
  const choices = new Set<number>([answer]);
  while (choices.size < 4) {
    const delta = 1 + rand(Math.max(3, Math.floor(answer / 3)));
    choices.add(Math.max(0, answer + (rand(2) === 0 ? delta : -delta)));
  }
  return { text, answer, choices: [...choices].sort(() => Math.random() - 0.5) };
}

export default function MathSprint() {
  const router = useRouter();
  const { isDone, markDone } = useCheder();
  const alreadyDone = isDone('math');

  const [stage, setStage] = React.useState<'idle' | 'run' | 'end'>('idle');
  const [timeLeft, setTimeLeft] = React.useState(ROUND_SECONDS);
  const [score, setScore] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  const [bestStreak, setBestStreak] = React.useState(0);
  const [question, setQuestion] = React.useState<Question | null>(null);
  const [flash, setFlash] = React.useState<'right' | 'wrong' | null>(null);

  const level = Math.min(4, 1 + Math.floor(score / 5));

  React.useEffect(() => {
    if (stage !== 'run') return;
    const t = window.setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          window.clearInterval(t);
          setStage('end');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [stage]);

  const start = () => {
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(ROUND_SECONDS);
    setQuestion(makeQuestion(1));
    setStage('run');
  };

  const answer = (n: number) => {
    if (!question) return;
    const right = n === question.answer;
    setFlash(right ? 'right' : 'wrong');
    window.setTimeout(() => setFlash(null), 250);
    if (right) {
      const nextScore = score + 1;
      setScore(nextScore);
      setStreak((s) => {
        const ns = s + 1;
        setBestStreak((b) => Math.max(b, ns));
        return ns;
      });
      setQuestion(makeQuestion(Math.min(4, 1 + Math.floor(nextScore / 5))));
    } else {
      setStreak(0);
      setQuestion(makeQuestion(level));
    }
  };

  const earned = Math.max(1, Math.min(15, Math.floor(score / 2)));

  return (
    <LessonShell
      accent={{ main: 'var(--ch-teal)', soft: 'var(--ch-teal-soft)' }}
      intro="Sixty seconds on the clock. Show me your kop — on your marks!"
      chip="Math · your own pace"
      title="Fluency sprint"
      subtitle="60 seconds. The questions grow with you."
    >
      {stage === 'idle' && (
        <div className="rounded-3xl border border-border bg-card p-6 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-3xl" style={{ backgroundColor: 'var(--ch-teal-soft)' }}>
            <Zap className="size-7 text-[var(--ch-teal)]" />
          </span>
          <p className="mt-4 font-serif text-2xl font-semibold">Ready?</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Answer as many as you can in 60 seconds. Five right in a row — the level goes up.
            This is the daily warm-up on top of your adaptive math program.
          </p>
          <Button size="lg" className="mt-5 h-12 w-full rounded-2xl text-base" onClick={start}>
            Start the sprint
          </Button>
        </div>
      )}

      {stage === 'run' && question && (
        <div
          className={cn(
            'rounded-3xl border bg-card p-6 transition-colors',
            flash === 'right' && 'border-primary bg-accent/60',
            flash === 'wrong' && 'border-destructive/50 bg-destructive/5',
            !flash && 'border-border',
          )}
        >
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Timer className="size-4" />
              <span className="tabular-nums">{timeLeft}s</span>
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="size-4 text-[var(--ch-teal)]" /> Level {level}
            </span>
            <span className={cn('flex items-center gap-1', streak >= 3 ? 'text-[var(--ch-amber)]' : 'text-muted-foreground')}>
              <Flame className={cn('size-4', streak >= 3 && 'fill-current')} />
              <span className="tabular-nums">{streak}</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--ch-teal)] transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / ROUND_SECONDS) * 100}%` }}
            />
          </div>
          <p className="my-8 text-center font-serif text-6xl font-semibold tracking-tight tabular-nums">
            {question.text}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {question.choices.map((c, i) => (
              <button
                key={`${c}-${i}`}
                type="button"
                onClick={() => answer(c)}
                className="h-16 rounded-2xl border border-border bg-background text-2xl font-semibold tabular-nums transition-colors hover:bg-muted active:scale-[0.98]"
              >
                {c}
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-sm font-semibold text-muted-foreground">
            Score: <span className="tabular-nums">{score}</span>
          </p>
        </div>
      )}

      {stage === 'end' && (
        <div className="rounded-3xl border border-[var(--ch-teal)]/40 bg-[var(--ch-teal-soft)] p-6 text-center">
          <p className="text-sm font-semibold text-[var(--ch-teal)] uppercase">Time!</p>
          <p className="mt-2 font-serif text-6xl font-semibold tabular-nums">{score}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            correct answers · best streak {bestStreak} · reached level {level}
          </p>
          {!alreadyDone && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-sm font-bold text-[var(--ch-amber)]">
              +{earned} <Ticket className="size-4" /> tickets
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Button size="lg" variant="outline" className="h-11 rounded-2xl bg-card" onClick={start}>
              Again
            </Button>
            <Button
              size="lg"
              className="h-11 rounded-2xl"
              onClick={() => {
                markDone('math', earned);
                router.push('/cheder/today');
              }}
            >
              Done for today
            </Button>
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        In the full school this sits on top of a serious adaptive program (Beast Academy–class):
        two hours of general studies a day, done properly.
      </p>
    </LessonShell>
  );
}
