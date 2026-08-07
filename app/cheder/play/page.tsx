'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brain, Lock, Palette, Puzzle, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LessonShell } from '../_components/lesson';
import { useCheder } from '../_components/state';

const GAMES = [
  { name: 'Math Sprint', desc: '60-second fluency race', icon: Zap, tint: 'var(--ch-teal-soft)', fg: 'var(--ch-teal)', href: '/cheder/lesson/math' },
  { name: 'Chess vs. Mendy', desc: 'Opens at recess', icon: Brain, tint: 'var(--ch-violet-soft)', fg: 'var(--ch-violet)', locked: true },
  { name: 'Parsha Puzzle', desc: 'Opens at recess', icon: Puzzle, tint: 'var(--ch-amber-soft)', fg: 'var(--ch-amber)', locked: true },
  { name: 'Drawing Studio', desc: 'Opens at recess', icon: Palette, tint: 'var(--ch-rose-soft)', fg: 'var(--ch-rose)', locked: true },
];

export default function PlayPage() {
  const router = useRouter();
  const { isDone, markDone } = useCheder();

  return (
    <LessonShell
      accent={{ main: 'var(--ch-green)', soft: 'var(--ch-green-soft)' }}
      chip="Recess · 20 minutes"
      title="Pick a game"
      subtitle="Only what the school approved — nothing else opens"
    >
      <div className="grid grid-cols-2 gap-2.5">
        {GAMES.map((game) => {
          const Icon = game.icon;
          const body = (
            <>
              <span className="flex size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: game.tint }}>
                {game.locked ? <Lock className="size-5 text-foreground/50" /> : <Icon className="size-5" style={{ color: game.fg }} />}
              </span>
              <span className="mt-3 block font-semibold">{game.name}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{game.desc}</span>
            </>
          );
          return game.locked ? (
            <div key={game.name} className="rounded-3xl border border-dashed border-border p-4 opacity-70">
              {body}
            </div>
          ) : (
            <Link key={game.name} href={game.href!} className="rounded-3xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
              {body}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <ShieldCheck className="size-5 shrink-0 text-[var(--ch-green)]" />
        The iPad stays in school mode: no open internet, no video feeds — the child switches
        rooms, never leaves the building.
      </div>

      {!isDone('recess-1') && (
        <Button
          size="lg"
          variant="outline"
          className="mt-4 h-11 w-full rounded-2xl"
          onClick={() => {
            markDone('recess-1', 2);
            router.push('/cheder/today');
          }}
        >
          Recess over — back to learning
        </Button>
      )}
    </LessonShell>
  );
}
