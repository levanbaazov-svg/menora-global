'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Scale, Soup, Sparkles, Sun, Wand2, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompletionCard, LessonShell } from '../_components/lesson';
import { HagalaScene, LightScene, TallisScene } from '../_components/scenes';
import { useCheder } from '../_components/state';

type Template = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  main: string;
  soft: string;
  Scene: React.ComponentType;
};

const TEMPLATES: Template[] = [
  {
    id: 'tallis',
    title: 'Shnayim Ochazin',
    subtitle: 'Today’s Mishna — the tallis in Beis Din',
    icon: Scale,
    main: 'var(--ch-violet)',
    soft: 'var(--ch-violet-soft)',
    Scene: TallisScene,
  },
  {
    id: 'hagala',
    title: 'Hagalas Keilim',
    subtitle: 'Halacha — how a pot turns kosher again',
    icon: Soup,
    main: 'var(--ch-amber)',
    soft: 'var(--ch-amber-soft)',
    Scene: HagalaScene,
  },
  {
    id: 'light',
    title: 'Day One',
    subtitle: 'Chumash — light separated from darkness',
    icon: Sun,
    main: 'var(--ch-sky)',
    soft: 'var(--ch-sky-soft)',
    Scene: LightScene,
  },
];

export default function CreateStudio() {
  const router = useRouter();
  const { isDone, markDone } = useCheder();
  const alreadyDone = isDone('create');
  const [picked, setPicked] = React.useState<Template | null>(null);
  const [stage, setStage] = React.useState<'pick' | 'making' | 'reveal' | 'done'>('pick');

  React.useEffect(() => {
    if (stage !== 'making') return;
    const t = window.setTimeout(() => setStage('reveal'), 2400);
    return () => window.clearTimeout(t);
  }, [stage]);

  return (
    <LessonShell
      chip="Bring it to life"
      title="Make it real"
      subtitle="Turn what you learned today into a living scene"
    >
      {stage === 'pick' && (
        <>
          <div className="space-y-2.5">
            {TEMPLATES.map((tpl) => {
              const Icon = tpl.icon;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    setPicked(tpl);
                    setStage('making');
                  }}
                  className="flex w-full items-center gap-3 rounded-3xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: tpl.soft }}>
                    <Icon className="size-5" style={{ color: tpl.main }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{tpl.title}</span>
                    <span className="block text-sm text-muted-foreground">{tpl.subtitle}</span>
                  </span>
                  <Wand2 className="size-4.5 shrink-0" style={{ color: tpl.main }} />
                </button>
              );
            })}
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <BadgeCheck className="size-3.5" style={{ color: 'var(--ch-green)' }} />
            Every template is approved by the Rav before a child ever sees it
          </p>
        </>
      )}

      {stage === 'making' && picked && (
        <div className="rounded-3xl border border-border bg-card p-6 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-3xl" style={{ backgroundColor: picked.soft }}>
            <Sparkles className="size-7" style={{ color: picked.main, animation: 'cheder-float 1.2s ease-in-out infinite' }} />
          </span>
          <p className="mt-4 font-serif text-xl font-semibold">Painting your scene…</p>
          <p className="mt-1 text-sm text-muted-foreground">{picked.title}</p>
          <div
            className="mx-auto mt-5 h-2.5 w-56 rounded-full"
            style={{
              backgroundImage: `linear-gradient(90deg, var(--muted) 25%, ${picked.soft} 50%, var(--muted) 75%)`,
              backgroundSize: '200% 100%',
              animation: 'cheder-shimmer 1.1s linear infinite',
            }}
          />
        </div>
      )}

      {stage === 'reveal' && picked && (
        <div style={{ animation: 'cheder-pop 0.4s ease-out both' }}>
          <picked.Scene />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold" style={{ color: picked.main }}>
              {picked.title}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <BadgeCheck className="size-3.5" style={{ color: 'var(--ch-green)' }} />
              Approved template
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Button
              size="lg"
              variant="outline"
              className="h-11 rounded-2xl"
              onClick={() => {
                setPicked(null);
                setStage('pick');
              }}
            >
              Make another
            </Button>
            <Button
              size="lg"
              className="h-11 rounded-2xl"
              onClick={() => {
                markDone('create', 5);
                setStage('done');
              }}
            >
              That’s my scene
            </Button>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <CompletionCard
          reward={5}
          alreadyDone={alreadyDone}
          message="Torah you can see — you made it yours"
          onFinish={() => router.push('/cheder/today')}
        />
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        In the full school these scenes are generated by AI — always inside templates the Rav
        approved in advance, never free-form.
      </p>
    </LessonShell>
  );
}
