'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HDate, Sedra } from '@hebcal/core';
import { ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { REBBE_NAME, RebbeArt, useRebbe } from '../_components/rebbe';
import { ROOMS, RoomVignette } from '../_components/rooms';
import { useCheder } from '../_components/state';

const TOUR_KEY = 'cheder-tour-v1';

type TourStep = { target: string | null; text: string; wave?: boolean };

const TOUR: TourStep[] = [
  { target: null, text: 'Sholom aleichem, {name}! Welcome to your school. Every door here is a real classroom. Come — let me show you around!', wave: true },
  { target: 'tefilla', text: 'This is our Beis Midrash. Every morning the whole class davens here together — live, with real friends.' },
  { target: 'chumash', text: 'The Chumash room. Today’s pasuk waits on the board — and every word opens when you tap it.' },
  { target: 'mishna', text: 'Mishna and Gemara. Every sugya has a map — who says what, and why. You can even watch the Mishna happen!' },
  { target: 'math', text: 'The math lab. Serious math at your own pace — sprints, games, and levels that grow with you.' },
  { target: 'yard', text: 'The yard! At recess the games open here. Only what the school approved — but plenty of fun.' },
  { target: 'store', text: 'The cheder store. Tickets you earn by learning become prizes, raffle entries — or tzedakah the school doubles.' },
  { target: 'desk', text: 'And your own desk — levels, streaks, and everything you have learned. Your parents see it too.' },
  { target: null, text: 'That is your school, {name}. Ready? Let us open your day!', wave: true },
];

export default function SchoolPage() {
  const router = useRouter();
  const { ready, child } = useCheder();
  const { say } = useRebbe();
  const [tourStep, setTourStep] = React.useState<number | null>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (ready && !child) router.replace('/cheder');
  }, [ready, child, router]);

  React.useEffect(() => {
    if (!ready || !child) return;
    try {
      if (!window.localStorage.getItem(TOUR_KEY)) setTourStep(0);
    } catch { /* no storage — skip tour */ }
  }, [ready, child]);

  const speakStep = React.useCallback((i: number) => {
    const step = TOUR[i];
    say(step.text.replace('{name}', child?.name ?? 'chaver'), { wave: step.wave, bubble: false });
    if (step.target && gridRef.current) {
      const el = gridRef.current.querySelector(`[data-room="${step.target}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [say, child]);

  React.useEffect(() => {
    if (tourStep !== null) speakStep(tourStep);
  }, [tourStep, speakStep]);

  const endTour = (goToDay: boolean) => {
    setTourStep(null);
    try { window.localStorage.setItem(TOUR_KEY, 'done'); } catch { /* fine */ }
    if (goToDay) router.push('/cheder/today');
  };

  if (!ready || !child) return <div className="py-10" />;

  const heb = (() => {
    try {
      const hd = new HDate();
      const sedra = new Sedra(hd.getFullYear(), false);
      const r = sedra.lookup(hd);
      return `${hd.renderGematriya()}${r.chag ? '' : ` · Parshas ${r.parsha.join('–')}`}`;
    } catch { return ''; }
  })();

  const highlight = tourStep !== null ? TOUR[tourStep].target : null;

  return (
    <div className="py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <MapPin className="size-3.5" style={{ color: 'var(--ch-blue)' }} />
            Online Cheder · Miami, Florida {heb && <>· {heb}</>}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
            {child.name}&apos;s school
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setTourStep(0)}
        >
          Tour again
        </Button>
      </div>

      <div ref={gridRef} className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ROOMS.map((room, i) => {
          const hasRoomPage = room.board.length > 0 || room.shelf.length > 0;
          const href = hasRoomPage ? `/cheder/room/${room.id}` : (room.cta?.href ?? '/cheder/today');
          const Icon = room.icon;
          return (
            <Link
              key={room.id}
              data-room={room.id}
              href={href}
              className={cn(
                'cheder-door block overflow-hidden rounded-3xl border border-border bg-card',
                highlight === room.id && 'tour-highlight',
              )}
              style={{ animation: `cheder-pop 0.4s ease-out ${i * 0.05}s both` }}
            >
              <div className="relative px-3 pt-3" style={{ backgroundColor: room.soft }}>
                <RoomVignette kind={room.vignette} main={room.main} />
                <span
                  className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-xl bg-card/90"
                >
                  <Icon className="size-4" style={{ color: room.main }} />
                </span>
              </div>
              <div className="p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-serif text-[1.05rem] font-semibold">{room.name}</p>
                  <p dir="rtl" className="shrink-0 text-sm font-semibold" style={{ color: room.main }}>
                    {room.he}
                  </p>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{room.status}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Live classes, a real rebbi and real friends — the rooms are how your day comes together.
      </p>

      {tourStep !== null && (
        <div className="fixed inset-x-0 bottom-0 z-[46] p-4 pb-6">
          <div
            className="mx-auto flex max-w-md items-end gap-3 rounded-3xl border border-border bg-card p-4 shadow-2xl"
            style={{ animation: 'cheder-pop 0.3s ease-out both' }}
          >
            <RebbeArt className="h-24 w-auto shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-bold tracking-wide uppercase" style={{ color: 'var(--ch-blue)' }}>
                {REBBE_NAME} · school tour {tourStep + 1}/{TOUR.length}
              </p>
              <p className="mt-1 text-sm leading-snug font-medium">
                {TOUR[tourStep].text.replace('{name}', child.name)}
              </p>
              <div className="mt-3 flex gap-2">
                {tourStep < TOUR.length - 1 ? (
                  <>
                    <Button size="sm" className="rounded-xl" onClick={() => setTourStep(tourStep + 1)}>
                      Next <ChevronRight className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => endTour(false)}>
                      Skip
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" className="rounded-xl" onClick={() => endTour(true)}>
                      Start my day
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => endTour(false)}>
                      Stay here
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
