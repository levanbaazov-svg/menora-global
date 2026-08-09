'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, Clapperboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CompletionCard, LessonShell, MasteryQuiz, type QuizQuestion } from '../../_components/lesson';
import { TallisScene } from '../../_components/scenes';
import { useCheder } from '../../_components/state';

const NODES = [
  {
    id: 'reuven',
    label: 'Reuven says',
    he: 'אֲנִי מְצָאתִיהָ',
    body: '“I found it — all of it is mine!”',
  },
  {
    id: 'shimon',
    label: 'Shimon says',
    he: 'אֲנִי מְצָאתִיהָ',
    body: '“I found it — all of it is mine!”',
  },
  {
    id: 'problem',
    label: 'The problem',
    body: 'Both are holding the tallis. Beis Din cannot just guess who is telling the truth.',
  },
  {
    id: 'din',
    label: 'The din of the Mishna',
    he: 'יַחֲלוֹקוּ',
    body: 'Each one swears he owns no less than half — and they split its value.',
  },
];

const QUIZ: QuizQuestion[] = [
  {
    q: 'What does each of them claim?',
    choices: ['“I found it — all of it is mine”', '“I bought it in the market”', '“Half of it is mine”'],
    correct: 0,
  },
  {
    q: 'Why can’t Beis Din simply hand it to Reuven?',
    choices: [
      'Shimon is holding it too — his claim is exactly as strong',
      'Because Reuven is younger',
      'Because a tallis may not be carried',
    ],
    correct: 0,
  },
  {
    q: 'So what is the din?',
    choices: [
      'Each swears about half, and they split the value',
      'Whoever grabbed it first keeps it',
      'Beis Din keeps the tallis',
    ],
    correct: 0,
    explain: 'שְׁנַיִם אוֹחֲזִין בְּטַלִּית... יַחֲלוֹקוּ — the very first Mishna of Bava Metzia.',
  },
];

export default function MishnaLesson() {
  const router = useRouter();
  const { isDone, markDone } = useCheder();
  const alreadyDone = isDone('mishna');
  const [opened, setOpened] = React.useState<Set<string>>(new Set());
  const [stage, setStage] = React.useState<'map' | 'quiz' | 'done'>('map');
  const [scene, setScene] = React.useState<'closed' | 'making' | 'playing'>('closed');

  React.useEffect(() => {
    if (scene !== 'making') return;
    const t = window.setTimeout(() => setScene('playing'), 1800);
    return () => window.clearTimeout(t);
  }, [scene]);

  const allOpened = opened.size === NODES.length;

  return (
    <LessonShell
      accent={{ main: 'var(--ch-violet)', soft: 'var(--ch-violet-soft)' }}
      intro="Two boys found one tallis — a real din Torah! Open the whole map, and you can even watch it happen."
      chip="Mishna · Bava Metzia 1:1"
      title="Shnayim Ochazin"
      hebrewTitle="שְׁנַיִם אוֹחֲזִין"
      subtitle="Two people, one tallis — the map of the sugya"
    >
      {stage === 'map' && (
        <>
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center justify-center gap-0">
              <div className="flex flex-col items-center">
                <span className="flex size-14 items-center justify-center rounded-full text-lg font-bold" style={{ backgroundColor: 'var(--ch-sky-soft)', color: 'var(--ch-sky)' }}>R</span>
                <span className="mt-1 text-xs font-semibold">Reuven</span>
              </div>
              <div className="mx-[-6px] h-16 w-40 rounded-xl border-2 border-[var(--ch-violet)]/40 bg-[var(--ch-violet-soft)] shadow-inner sm:w-56">
                <p className="pt-5 text-center text-xs font-bold tracking-wide text-[var(--ch-violet)] uppercase">
                  the tallis
                </p>
              </div>
              <div className="flex flex-col items-center">
                <span className="flex size-14 items-center justify-center rounded-full text-lg font-bold" style={{ backgroundColor: 'var(--ch-teal-soft)', color: 'var(--ch-teal)' }}>S</span>
                <span className="mt-1 text-xs font-semibold">Shimon</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setScene('making')}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-2.5 text-sm font-bold transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--ch-violet)', color: 'var(--ch-violet)', backgroundColor: 'var(--ch-violet-soft)' }}
            >
              <Clapperboard className="size-4.5" /> Bring it to life — watch this Mishna
            </button>

            <p className="mt-5 text-sm font-medium text-muted-foreground">
              Open every part of the map · {opened.size}/{NODES.length}
            </p>
            <div className="mt-3 space-y-2">
              {NODES.map((node, i) => {
                const open = opened.has(node.id);
                return (
                  <React.Fragment key={node.id}>
                    {i === 2 && <ArrowDown className="mx-auto size-4 text-muted-foreground" />}
                    {i === 3 && <ArrowDown className="mx-auto size-4 text-muted-foreground" />}
                    <button
                      type="button"
                      onClick={() => setOpened((s) => new Set(s).add(node.id))}
                      className={cn(
                        'w-full rounded-2xl border px-4 py-3 text-left transition-colors',
                        open ? 'border-[var(--ch-violet)]/40 bg-card' : 'border-border bg-secondary hover:bg-muted',
                      )}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold">{node.label}</span>
                        {node.he && open && (
                          <span dir="rtl" className="text-lg font-semibold text-[var(--ch-violet)]">
                            {node.he}
                          </span>
                        )}
                      </span>
                      {open ? (
                        <span className="mt-1 block text-sm text-muted-foreground">{node.body}</span>
                      ) : (
                        <span className="mt-1 block text-sm text-muted-foreground/60">
                          Tap to open
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
            <Button
              size="lg"
              disabled={!allOpened}
              className="mt-4 h-11 w-full rounded-2xl"
              onClick={() => setStage('quiz')}
            >
              {allOpened ? 'I see the whole picture — check me' : 'Open the whole map first'}
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Every sugya in the school comes with a map like this — who holds what, who says what,
            and why.
          </p>
        </>
      )}

      {stage === 'quiz' && (
        <MasteryQuiz
          questions={QUIZ}
          onDone={() => {
            markDone('mishna', 10);
            setStage('done');
          }}
        />
      )}

      {stage === 'done' && (
        <CompletionCard
          reward={10}
          alreadyDone={alreadyDone}
          message="The first Mishna of Bava Metzia is yours"
          onFinish={() => router.push('/cheder/today')}
        />
      )}

      {scene !== 'closed' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setScene('closed')}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-card p-4 shadow-xl"
            style={{ animation: 'cheder-pop 0.3s ease-out both' }}
            onClick={(e) => e.stopPropagation()}
          >
            {scene === 'making' ? (
              <div className="py-14 text-center">
                <p className="font-serif text-xl font-semibold">Painting the scene…</p>
                <div
                  className="mx-auto mt-4 h-2.5 w-52 rounded-full"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, var(--muted) 25%, var(--ch-violet-soft) 50%, var(--muted) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'cheder-shimmer 1.1s linear infinite',
                  }}
                />
              </div>
            ) : (
              <>
                <TallisScene />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ch-violet)' }}>
                    Shnayim Ochazin — live
                  </p>
                  <button
                    type="button"
                    onClick={() => setScene('closed')}
                    className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
                    aria-label="Close scene"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </LessonShell>
  );
}
