'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Calculator, MapPin, Scale, Star, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { REBBE_NAME, RebbeArt, useRebbe } from './_components/rebbe';
import { useCheder } from './_components/state';

const GRADES = [1, 2, 3, 4, 5];

const FAVORITES: Array<{ id: string; label: string; icon: LucideIcon; main: string; soft: string }> = [
  { id: 'chumash', label: 'Chumash', icon: BookOpen, main: 'var(--ch-blue)', soft: 'var(--ch-blue-soft)' },
  { id: 'mishna', label: 'Mishna', icon: Scale, main: 'var(--ch-violet)', soft: 'var(--ch-violet-soft)' },
  { id: 'math', label: 'Math', icon: Calculator, main: 'var(--ch-teal)', soft: 'var(--ch-teal-soft)' },
  { id: 'stories', label: 'Stories', icon: Star, main: 'var(--ch-amber)', soft: 'var(--ch-amber-soft)' },
];

type Step = 'hello' | 'name' | 'grade' | 'favorite';
const STEPS: Step[] = ['hello', 'name', 'grade', 'favorite'];

export default function ChederLanding() {
  const router = useRouter();
  const { ready, child, enroll, reset } = useCheder();
  const { say } = useRebbe();
  const [step, setStep] = React.useState<Step>('hello');
  const [name, setName] = React.useState('');
  const [grade, setGrade] = React.useState<number | null>(null);

  const goName = () => {
    say(`Sholom aleichem! I am ${REBBE_NAME}, your melamed. And what is your name?`, { wave: true });
    setStep('name');
  };
  const goGrade = () => {
    if (!name.trim()) return;
    say(`${name.trim()}! A beautiful name. And what grade are you in?`);
    setStep('grade');
  };
  const goFavorite = (g: number) => {
    setGrade(g);
    say(`Grade ${g} — wonderful. One more thing: what do you love learning most?`);
    setStep('favorite');
  };
  const finish = (favorite: string) => {
    if (!name.trim() || grade === null) return;
    enroll({ name: name.trim(), grade, favorite });
    say(`Welcome to the cheder, ${name.trim()}! Come — let me show you your school.`, { wave: true });
    router.push('/cheder/school');
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <RebbeArt className="mx-auto h-44 w-auto drop-shadow-xl" />
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight">
            Online <span style={{ color: 'var(--ch-blue)' }}>Cheder</span>
          </h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground">
            <MapPin className="size-3.5" style={{ color: 'var(--ch-blue)' }} />
            with Rabbi Khanukaev · Miami, Florida
          </p>
          <p dir="rtl" className="mt-2 text-lg font-medium" style={{ color: 'var(--ch-blue)' }}>
            חינוך של חדר — לכל ילד, בכל מקום
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          {!ready ? (
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          ) : child ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Welcome back,</p>
              <p className="mt-1 font-serif text-2xl font-semibold">
                {child.name} · Grade {child.grade}
              </p>
              <Button
                size="lg"
                className="mt-5 h-12 w-full rounded-2xl text-base"
                onClick={() => router.push('/cheder/school')}
              >
                Enter my school
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-muted-foreground"
                onClick={reset}
              >
                Start over with a new talmid
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex justify-center gap-1.5">
                {STEPS.map((s, i) => (
                  <span
                    key={s}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: s === step ? 24 : 10,
                      backgroundColor: STEPS.indexOf(step) >= i ? 'var(--ch-blue)' : 'var(--border)',
                    }}
                  />
                ))}
              </div>

              {step === 'hello' && (
                <div className="text-center">
                  <h2 className="font-serif text-2xl font-semibold">Your school is waiting</h2>
                  <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                    A real cheder — live davening, friends, a rebbi who knows you — right here.
                  </p>
                  <Button size="lg" className="mt-5 h-12 w-full rounded-2xl text-base" onClick={goName}>
                    Meet your melamed
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">He talks. Turn your sound on.</p>
                </div>
              )}

              {step === 'name' && (
                <div>
                  <h2 className="font-serif text-xl font-semibold">What&apos;s your name?</h2>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && goGrade()}
                    placeholder="Mendel"
                    autoFocus
                    className="mt-3 h-12 rounded-xl text-center text-lg"
                    autoComplete="off"
                  />
                  <Button size="lg" disabled={!name.trim()} className="mt-4 h-12 w-full rounded-2xl text-base" onClick={goGrade}>
                    That&apos;s me
                  </Button>
                </div>
              )}

              {step === 'grade' && (
                <div>
                  <button type="button" onClick={() => setStep('name')} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <ArrowLeft className="size-3.5" /> back
                  </button>
                  <h2 className="mt-2 font-serif text-xl font-semibold">What grade are you in, {name.trim()}?</h2>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {GRADES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => goFavorite(g)}
                        className={cn(
                          'h-14 rounded-2xl border text-lg font-bold transition-all hover:-translate-y-0.5',
                          grade === g
                            ? 'border-[var(--ch-blue)] bg-[var(--ch-blue)] text-white'
                            : 'border-border bg-background hover:bg-muted',
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 'favorite' && (
                <div>
                  <button type="button" onClick={() => setStep('grade')} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <ArrowLeft className="size-3.5" /> back
                  </button>
                  <h2 className="mt-2 font-serif text-xl font-semibold">What do you love learning most?</h2>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {FAVORITES.map(({ id, label, icon: Icon, main, soft }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => finish(id)}
                        className="flex items-center gap-3 rounded-2xl border border-border p-3 text-left font-semibold transition-all hover:-translate-y-0.5 hover:bg-muted"
                      >
                        <span className="flex size-10 items-center justify-center rounded-xl" style={{ backgroundColor: soft, color: main }}>
                          <Icon className="size-5" />
                        </span>
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Your school builds itself around what you love — and what you need.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
