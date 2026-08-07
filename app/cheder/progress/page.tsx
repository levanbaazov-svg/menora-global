'use client';

import { Bell, Flame, Mail, RefreshCcw } from 'lucide-react';
import { LessonShell } from '../_components/lesson';
import { useCheder } from '../_components/state';

const SUBJECTS = [
  { name: 'Kriah', level: 4, mastery: 82, color: 'var(--ch-sky)' },
  { name: 'Chumash', level: 2, mastery: 91, color: 'var(--ch-blue)' },
  { name: 'Mishna', level: 1, mastery: 75, color: 'var(--ch-violet)' },
  { name: 'Math', level: 5, mastery: 88, color: 'var(--ch-teal)' },
  { name: 'English reading', level: 3, mastery: 79, color: 'var(--ch-green)' },
];

export default function ProgressPage() {
  const { child } = useCheder();
  const name = child?.name ?? 'Your child';

  return (
    <LessonShell
      chip="My progress"
      title="One child, one map"
      subtitle="Not one grade for everything — a real level in every subject"
    >
      <div className="space-y-2.5">
        {SUBJECTS.map((s) => (
          <div key={s.name} className="rounded-3xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm font-bold" style={{ color: s.color }}>
                Level {s.level}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${s.mastery}%`, backgroundColor: s.color }}
                />
              </div>
              <span className="w-10 text-right text-sm font-semibold text-muted-foreground tabular-nums">
                {s.mastery}%
              </span>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--ch-amber-soft)' }}>
              <Flame className="size-5 text-[var(--ch-amber)]" />
            </span>
            <div>
              <p className="font-semibold">Davening streak</p>
              <p className="text-xs text-muted-foreground">every morning with the class</p>
            </div>
          </div>
          <p className="font-serif text-2xl font-semibold tabular-nums">6 days</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        <div className="flex items-start gap-3 rounded-3xl border border-border bg-card p-4 text-sm">
          <RefreshCcw className="mt-0.5 size-4.5 shrink-0 text-[var(--ch-blue)]" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">The plan rebuilds itself weekly.</span>{' '}
            Strong in math? Deeper problems, not busywork. Mishna dipping? More time, an easier
            ramp.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-3xl border border-border bg-card p-4 text-sm">
          <Bell className="mt-0.5 size-4.5 shrink-0 text-[var(--ch-rose)]" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">A person sees every dip, same day.</span>{' '}
            {name}&apos;s mashpia gets the flag before a small struggle becomes a big one.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-border bg-secondary p-5">
        <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
          <Mail className="size-4" /> Weekly report · sent to parents automatically
        </p>
        <div className="mt-3 rounded-2xl bg-card p-4 text-sm leading-relaxed">
          <p className="font-serif text-base font-semibold">This week: {name}</p>
          <p className="mt-2 text-muted-foreground">
            Mastered 4 units (Chumash ×2, Mishna ×1, Math ×1) at 87% average first-try mastery.
            Davened with the class 5 of 5 mornings. Chavrusa attendance: 5/5. Math moved up to
            Level 5 — we added two enrichment sets. Mishna needs one more pass on Shnayim Ochazin;
            the mashpia will review it at Thursday&apos;s 1:1.
          </p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Generated from real learning data — no teacher spends Sunday night writing it.
        </p>
      </div>
    </LessonShell>
  );
}
