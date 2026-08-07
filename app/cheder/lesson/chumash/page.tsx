'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CompletionCard, LessonShell, MasteryQuiz, type QuizQuestion } from '../../_components/lesson';
import { useCheder } from '../../_components/state';

const WORDS = [
  { he: 'בְּרֵאשִׁית', en: 'In the beginning' },
  { he: 'בָּרָא', en: 'created' },
  { he: 'אֱלֹקִים', en: 'Hashem' },
  { he: 'אֵת הַשָּׁמַיִם', en: 'the heavens' },
  { he: 'וְאֵת הָאָרֶץ', en: 'and the earth' },
];

const RASHI_CHOICES = [
  'Because the whole world is Hashem’s — He created it, so He can give Eretz Yisroel to Am Yisroel',
  'Because creation happened first, so it has to be written first',
  'To teach us how nature works',
];

const QUIZ: QuizQuestion[] = [
  {
    q: 'What does this word mean?',
    hebrew: 'בָּרָא',
    choices: ['created', 'rested', 'said'],
    correct: 0,
    explain: 'בָּרָא — created, something from nothing. Only Hashem can do that.',
  },
  {
    q: 'Who created the heavens and the earth?',
    choices: ['Hashem', 'The malachim', 'Nobody — the world was always here'],
    correct: 0,
  },
  {
    q: 'Rashi: why does the Torah start with creation?',
    choices: [
      'To show the world belongs to Hashem — and He gave Eretz Yisroel to His people',
      'Because it is the oldest story',
      'To teach science before mitzvos',
    ],
    correct: 0,
    explain: 'Koach maasav higid le’amo — He showed His people the power of His deeds.',
  },
];

export default function ChumashLesson() {
  const router = useRouter();
  const { isDone, markDone } = useCheder();
  const alreadyDone = isDone('chumash');
  const [stage, setStage] = React.useState<'words' | 'rashi' | 'quiz' | 'done'>('words');
  const [tapped, setTapped] = React.useState<Set<number>>(new Set());
  const [activeWord, setActiveWord] = React.useState<number | null>(null);
  const [rashiPick, setRashiPick] = React.useState<number | null>(null);

  return (
    <LessonShell
      chip="Chumash · Unit 1"
      title="Bereishis 1:1"
      hebrewTitle="בְּרֵאשִׁית"
      subtitle="Every word of the pasuk, then Rashi's famous question"
    >
      {stage === 'words' && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Tap every word to open it · {tapped.size}/{WORDS.length}
          </p>
          <div dir="rtl" className="mt-5 flex flex-wrap gap-x-2 gap-y-3 text-3xl leading-loose">
            {WORDS.map((word, i) => (
              <button
                key={word.he}
                type="button"
                onClick={() => {
                  setActiveWord(i);
                  setTapped((s) => new Set(s).add(i));
                }}
                className={cn(
                  'rounded-xl px-2 py-1 transition-colors',
                  activeWord === i
                    ? 'bg-accent text-accent-foreground'
                    : tapped.has(i)
                      ? 'text-foreground underline decoration-primary/50 decoration-2 underline-offset-8'
                      : 'text-foreground/70 hover:bg-muted',
                )}
              >
                {word.he}
              </button>
            ))}
          </div>
          <div className="mt-4 flex min-h-12 items-center rounded-2xl bg-secondary px-4 py-3">
            {activeWord !== null ? (
              <p className="text-sm">
                <span dir="rtl" className="text-lg font-semibold">{WORDS[activeWord].he}</span>
                <span className="mx-2 text-muted-foreground">—</span>
                <span className="font-medium">{WORDS[activeWord].en}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">The meaning appears here</p>
            )}
          </div>
          <Button
            size="lg"
            disabled={tapped.size < WORDS.length}
            className="mt-4 h-11 w-full rounded-2xl"
            onClick={() => setStage('rashi')}
          >
            {tapped.size < WORDS.length ? 'Open every word first' : 'I know the pasuk — what does Rashi ask?'}
          </Button>
        </div>
      )}

      {stage === 'rashi' && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <BookOpen className="size-4.5" />
            </span>
            <p className="font-serif text-lg font-semibold">Rashi asks:</p>
          </div>
          <p className="mt-3 rounded-2xl bg-secondary p-4 text-[0.95rem] leading-relaxed">
            The Torah is a book of mitzvos. So why does it begin with the story of creation — and
            not with the very first mitzvah given to Am Yisroel?
          </p>
          <p className="mt-4 text-sm font-medium text-muted-foreground">What is Rashi&apos;s answer?</p>
          <div className="mt-2 space-y-2">
            {RASHI_CHOICES.map((choice, i) => (
              <button
                key={choice}
                type="button"
                disabled={rashiPick === 0}
                onClick={() => setRashiPick(i)}
                className={cn(
                  'w-full rounded-2xl border px-4 py-3 text-left text-[0.95rem] font-medium transition-colors',
                  rashiPick === null && 'border-border hover:bg-muted',
                  rashiPick !== null && i === 0 && 'border-primary bg-accent text-accent-foreground',
                  rashiPick === i && i !== 0 && 'border-destructive/40 bg-destructive/10 text-destructive',
                  rashiPick !== null && rashiPick !== i && i !== 0 && 'border-border opacity-50',
                )}
              >
                {choice}
              </button>
            ))}
          </div>
          {rashiPick !== null && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                {rashiPick === 0
                  ? 'Yes — the world is His, so no nation can ever say Eretz Yisroel isn’t ours.'
                  : 'Look again — Rashi’s answer is about Whose world it is.'}
              </p>
              {rashiPick === 0 && (
                <Button size="lg" className="mt-3 h-11 w-full rounded-2xl" onClick={() => setStage('quiz')}>
                  Got it — check my mastery
                </Button>
              )}
              {rashiPick !== 0 && (
                <Button
                  size="lg"
                  variant="outline"
                  className="mt-3 h-11 w-full rounded-2xl"
                  onClick={() => setRashiPick(null)}
                >
                  Try again
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {stage === 'quiz' && (
        <MasteryQuiz
          questions={QUIZ}
          onDone={() => {
            markDone('chumash', 10);
            setStage('done');
          }}
        />
      )}

      {stage === 'done' && (
        <CompletionCard
          reward={10}
          alreadyDone={alreadyDone}
          message="Unit 1 mastered — next up: יוֹם אֶחָד"
          onFinish={() => router.push('/cheder/today')}
        />
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        You move to the next pasuk only when this one is truly yours — that&apos;s the 80% mastery
        gate.
      </p>
    </LessonShell>
  );
}
