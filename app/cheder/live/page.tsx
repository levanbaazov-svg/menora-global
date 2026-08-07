'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Mic, MicOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CompletionCard, LessonShell } from '../_components/lesson';
import { useCheder } from '../_components/state';

const MISSION = [
  'Say the Mishna to Levi in your own words',
  'Levi says it back to you',
  'Agree together: who swears, and what do they split?',
];

export default function ChavrusaRoom() {
  const router = useRouter();
  const { child, isDone, markDone } = useCheder();
  const alreadyDone = isDone('chavrusa');
  const [checked, setChecked] = React.useState<Set<number>>(new Set());
  const [finished, setFinished] = React.useState(false);
  const [muted, setMuted] = React.useState(false);

  const allChecked = checked.size === MISSION.length;
  const myName = child?.name ?? 'You';

  return (
    <LessonShell
      chip="Chavrusa · Live"
      title="You & Levi"
      subtitle="Same pair all zman — matched by level and time zone"
    >
      {!finished ? (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            {[{ name: myName, me: true }, { name: 'Levi', me: false }].map((p) => (
              <div
                key={p.name}
                className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl border border-border"
                style={{ backgroundColor: p.me ? 'var(--scenario-sky)' : 'var(--scenario-mint)' }}
              >
                <span className="flex size-16 items-center justify-center rounded-full bg-card font-serif text-2xl font-bold shadow-sm">
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-xs font-semibold">
                  {p.me && muted ? <MicOff className="size-3.5 text-destructive" /> : <Mic className="size-3.5 text-primary" />}
                  {p.name}
                </span>
                <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-destructive/90 px-2 py-0.5 text-[0.65rem] font-bold text-white uppercase">
                  <Video className="size-3" /> Live
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex justify-center">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setMuted((m) => !m)}>
              {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              {muted ? 'Unmute' : 'Mute'}
            </Button>
          </div>

          <div className="mt-4 rounded-3xl border border-border bg-card p-6">
            <p className="font-serif text-lg font-semibold">Today&apos;s mission</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Shnayim Ochazin — make it yours by saying it out loud</p>
            <div className="mt-3 space-y-2">
              {MISSION.map((step, i) => {
                const on = checked.has(i);
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() =>
                      setChecked((s) => {
                        const n = new Set(s);
                        if (n.has(i)) n.delete(i);
                        else n.add(i);
                        return n;
                      })
                    }
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-[0.95rem] font-medium transition-colors',
                      on ? 'border-primary/40 bg-accent/60' : 'border-border hover:bg-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                        on ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                      )}
                    >
                      {on && <Check className="size-4" />}
                    </span>
                    {step}
                  </button>
                );
              })}
            </div>
            <Button
              size="lg"
              disabled={!allChecked}
              className="mt-4 h-11 w-full rounded-2xl"
              onClick={() => {
                markDone('chavrusa', 5);
                setFinished(true);
              }}
            >
              {allChecked ? 'Finish chavrusa' : 'Work through the mission together'}
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Torah is learned out loud, with a friend — every day, built into the schedule.
          </p>
        </>
      ) : (
        <CompletionCard
          reward={5}
          alreadyDone={alreadyDone}
          message="A sugya said out loud is a sugya remembered"
          onFinish={() => router.push('/cheder/today')}
        />
      )}
    </LessonShell>
  );
}
