'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, GraduationCap, HeartHandshake, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCheder } from './_components/state';

const GRADES = [1, 2, 3, 4, 5];

const PILLARS = [
  { icon: Users, text: 'Live davening, chavrusas and shiurim — every single day', main: 'var(--ch-rose)', soft: 'var(--ch-rose-soft)' },
  { icon: Sparkles, text: 'A personal program that adapts to every child', main: 'var(--ch-amber)', soft: 'var(--ch-amber-soft)' },
  { icon: BookOpen, text: 'Torah that comes alive: maps, charts, interactive text', main: 'var(--ch-blue)', soft: 'var(--ch-blue-soft)' },
  { icon: HeartHandshake, text: 'A mashpia for every 10–15 talmidim', main: 'var(--ch-green)', soft: 'var(--ch-green-soft)' },
];

export default function ChederLanding() {
  const router = useRouter();
  const { ready, child, enroll, reset } = useCheder();
  const [name, setName] = React.useState('');
  const [grade, setGrade] = React.useState<number | null>(null);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-black/10">
            <GraduationCap className="size-8" />
          </span>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Online <span style={{ color: 'var(--ch-blue)' }}>Cheder</span></h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            with Rabbi Khanukaev · Cheder Atlanta
          </p>
          <p dir="rtl" className="mt-3 text-lg font-medium" style={{ color: 'var(--ch-blue)' }}>
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
                onClick={() => router.push('/cheder/today')}
              >
                Open my day
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim() || grade === null) return;
                enroll({ name: name.trim(), grade });
                router.push('/cheder/today');
              }}
            >
              <h2 className="font-serif text-xl font-semibold">Enroll your first talmid</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This is a live demo — the account is created right here on this device.
              </p>
              <label className="mt-5 block text-sm font-medium" htmlFor="cheder-name">
                Child&apos;s name
              </label>
              <Input
                id="cheder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mendel"
                className="mt-1.5 h-12 rounded-xl text-base"
                autoComplete="off"
              />
              <p className="mt-4 text-sm font-medium">Grade</p>
              <div className="mt-1.5 grid grid-cols-5 gap-2">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={cn(
                      'h-12 rounded-xl border text-base font-semibold transition-colors',
                      grade === g
                        ? 'border-[var(--ch-blue)] bg-[var(--ch-blue)] text-white'
                        : 'border-border bg-background hover:bg-muted',
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={!name.trim() || grade === null}
                className="mt-6 h-12 w-full rounded-2xl text-base"
              >
                Create student account
              </Button>
            </form>
          )}
        </div>

        <ul className="mt-8 space-y-3">
          {PILLARS.map(({ icon: Icon, text, main, soft }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: soft, color: main }}>
                <Icon className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
