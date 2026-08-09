'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Mic, Sunrise, Volume2 } from 'lucide-react';
import { speak } from '../../_components/voice';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CompletionCard, LessonShell } from '../../_components/lesson';
import { useCheder } from '../../_components/state';

const PHRASES = [
  { he: 'מוֹדֶה אֲנִי לְפָנֶיךָ', tr: 'Modeh ani lefanecha', en: 'I give thanks before You' },
  { he: 'מֶלֶךְ חַי וְקַיָּם', tr: 'melech chai vekayam', en: 'living and everlasting King' },
  { he: 'שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה', tr: 'shehechezarta bi nishmasi bechemla', en: 'for You returned my neshama to me with kindness' },
  { he: 'רַבָּה אֱמוּנָתֶךָ', tr: 'rabba emunasecha', en: 'great is Your faithfulness' },
];

const CLASSMATES = ['Levi', 'Mendy', 'Sholom', 'Zalmy'];

export default function TefillaLesson() {
  const router = useRouter();
  const { isDone, markDone } = useCheder();
  const alreadyDone = isDone('tefilla');
  const [learned, setLearned] = React.useState<Set<number>>(new Set());
  const [active, setActive] = React.useState<number | null>(null);
  const [stage, setStage] = React.useState<'learn' | 'read' | 'done'>('learn');
  const [readPos, setReadPos] = React.useState(-1);

  const allLearned = learned.size === PHRASES.length;

  return (
    <LessonShell
      accent={{ main: 'var(--ch-sky)', soft: 'var(--ch-sky-soft)' }}
      intro="Boker tov! Let us thank Hashem for a brand new day — word by word."
      chip="Tefilla · Live class"
      title="Modeh Ani"
      hebrewTitle="מוֹדֶה אֲנִי"
      subtitle="The first words of a Yid's day"
    >
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5">
        <span className="flex -space-x-2">
          {CLASSMATES.map((n) => (
            <span
              key={n}
              className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-secondary text-xs font-bold"
            >
              {n[0]}
            </span>
          ))}
        </span>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Rabbi K.&apos;s class</span> is davening
          with you
        </p>
        <Mic className="ml-auto size-4 text-destructive" />
      </div>

      {stage === 'learn' && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Tap each phrase to learn what it means · {learned.size}/{PHRASES.length}
          </p>
          <div dir="rtl" className="mt-4 space-y-2">
            {PHRASES.map((phrase, i) => (
              <button
                key={phrase.he}
                type="button"
                onClick={() => {
                  setActive(i);
                  setLearned((s) => new Set(s).add(i));
                }}
                className={cn(
                  'w-full rounded-2xl border px-4 py-3 text-right text-2xl leading-relaxed transition-colors',
                  active === i
                    ? 'border-[var(--ch-sky)]/60 bg-[var(--ch-sky-soft)]'
                    : learned.has(i)
                      ? 'border-[var(--ch-sky)]/40 bg-card'
                      : 'border-border hover:bg-muted',
                )}
              >
                {phrase.he}
                {learned.has(i) && (
                  <span dir="ltr" className="mt-1 block text-sm font-medium text-muted-foreground">
                    {phrase.en}
                  </span>
                )}
              </button>
            ))}
          </div>
          {active !== null && (
            <button
              type="button"
              onClick={() => speak(`${PHRASES[active].tr} — ${PHRASES[active].en}`)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-2 text-sm font-semibold text-[var(--ch-sky)] transition-colors hover:bg-muted"
            >
              <Volume2 className="size-4" /> Hear this phrase
            </button>
          )}
          <Button
            size="lg"
            disabled={!allLearned}
            className="mt-5 h-11 w-full rounded-2xl"
            onClick={() => {
              setStage('read');
              setReadPos(0);
            }}
          >
            {allLearned ? 'Now daven it — read along' : 'Tap every phrase first'}
          </Button>
        </div>
      )}

      {stage === 'read' && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sunrise className="size-4 text-[var(--ch-sky)]" /> Read each phrase out loud, then tap it
          </p>
          <div dir="rtl" className="mt-4 space-y-3 text-3xl leading-relaxed">
            {PHRASES.map((phrase, i) => (
              <button
                key={phrase.he}
                type="button"
                disabled={i !== readPos}
                onClick={() => {
                  if (readPos < PHRASES.length - 1) setReadPos(readPos + 1);
                  else {
                    markDone('tefilla', 5);
                    setStage('done');
                  }
                }}
                className={cn(
                  'block w-full rounded-2xl px-3 py-2 text-right transition-all',
                  i === readPos && 'bg-[var(--ch-sky-soft)] text-[var(--ch-sky)] shadow-sm',
                  i < readPos && 'text-muted-foreground/50',
                  i > readPos && 'text-foreground/30',
                )}
              >
                {phrase.he}
                {i < readPos && <Check className="mr-2 inline size-5 text-[var(--ch-green)]" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 'done' && (
        <CompletionCard
          reward={5}
          alreadyDone={alreadyDone}
          message="Boker tov — your day started the right way"
          onFinish={() => router.push('/cheder/today')}
        />
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Points here are for reading skills — never for the davening itself.
      </p>
    </LessonShell>
  );
}
