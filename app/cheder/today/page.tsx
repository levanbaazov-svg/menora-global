'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HDate, Sedra } from '@hebcal/core';
import {
  BookMarked, BookOpen, Calculator, CalendarHeart, Check, ChevronRight, Gamepad2,
  MapPin, MonitorOff, Scale, Sparkles, Star, Sunrise, Sunset, UtensilsCrossed,
  Users, Video, type LucideIcon,
} from 'lucide-react';
import {
  Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useCheder } from '../_components/state';

type Block = {
  id: string;
  time: string;
  title: string;
  sub: string;
  icon: LucideIcon;
  tint: string;
  kind: 'live' | 'lesson' | 'platform' | 'recess' | 'off' | 'preview';
  href?: string;
  preview?: string;
  previewLive?: boolean;
};

const BLOCKS: Block[] = [
  { id: 'tefilla', time: '8:00', title: 'Tefilla — whole class', sub: 'Live · Modeh Ani, morning brachos', icon: Sunrise, tint: 'var(--scenario-sky)', kind: 'live', href: '/cheder/lesson/tefilla' },
  { id: 'chumash', time: '8:40', title: 'Chumash — Bereishis', sub: 'The very first pasuk + Rashi\u2019s question', icon: BookOpen, tint: 'var(--scenario-yellow)', kind: 'lesson', href: '/cheder/lesson/chumash' },
  { id: 'recess-1', time: '9:15', title: 'Recess', sub: 'Approved games only — pick one', icon: Gamepad2, tint: 'var(--scenario-mint)', kind: 'recess', href: '/cheder/play' },
  { id: 'mishna', time: '9:35', title: 'Mishna — Shnayim Ochazin', sub: 'Two people, one tallis: the sugya map', icon: Scale, tint: 'var(--scenario-lavender)', kind: 'lesson', href: '/cheder/lesson/mishna' },
  { id: 'chavrusa', time: '10:10', title: 'Chavrusa with Levi', sub: 'Live · retell the Mishna to each other', icon: Users, tint: 'var(--scenario-rose)', kind: 'live', href: '/cheder/live' },
  { id: 'math', time: '10:40', title: 'Math — my own pace', sub: 'Fluency sprint + adaptive practice', icon: Calculator, tint: 'var(--scenario-sky)', kind: 'platform', href: '/cheder/lesson/math' },
  { id: 'lunch', time: '11:30', title: 'Lunch & outside', sub: 'Real-world time', icon: UtensilsCrossed, tint: 'var(--scenario-cream)', kind: 'off' },
  { id: 'english', time: '1:00', title: 'English reading', sub: 'Adaptive reading · your level', icon: BookMarked, tint: 'var(--scenario-mint)', kind: 'preview', preview: 'A serious adaptive reading program (Lexia-class) at exactly the child\u2019s level — part of the ~2-hour general-studies block, the same subjects Chabad schools teach, done properly.' },
  { id: 'chassidus', time: '1:45', title: 'Chassidus — story time', sub: 'The Alter Rebbe + the sefiros chart', icon: Star, tint: 'var(--scenario-lavender)', kind: 'preview', preview: 'A story of the Alter Rebbe, then the sefiros chart assembled by hand like a puzzle — every canonical chart approved by the Rav before a child ever sees it.' },
  { id: 'create', time: '2:15', title: 'Bring it to life', sub: 'Make a picture of what you learned', icon: Sparkles, tint: 'var(--scenario-yellow)', kind: 'preview', preview: 'The child turns today\u2019s learning into a picture or a 30-second clip — only inside scene templates the Rav approves in advance. Nothing is generated free-form.' },
  { id: 'shiur', time: '2:30', title: 'Shiur with Rabbi Khanukaev', sub: 'Live · the whole cheder together', icon: Video, tint: 'var(--scenario-rose)', kind: 'preview', previewLive: true, preview: 'Three times a week the whole cheder gathers live with the Rav — the anchor that makes this a school, not an app.' },
  { id: 'mincha', time: '3:15', title: 'Mincha + day recap', sub: 'Live · finish the day together', icon: Sunset, tint: 'var(--scenario-cream)', kind: 'preview', previewLive: true, preview: 'The day closes the way it opened: together. Mincha, a two-minute recap of what everyone learned, and tickets for the day are counted.' },
];

function hebrewToday(): { date: string; parsha: string } {
  try {
    const hd = new HDate();
    const sedra = new Sedra(hd.getFullYear(), false);
    const reading = sedra.lookup(hd);
    return {
      date: hd.renderGematriya(),
      parsha: reading.chag ? '' : `Parshas ${reading.parsha.join('–')}`,
    };
  } catch {
    return { date: '', parsha: '' };
  }
}

export default function TodayPage() {
  const router = useRouter();
  const { ready, child, isDone } = useCheder();
  const [preview, setPreview] = React.useState<Block | null>(null);
  const [heb] = React.useState(hebrewToday);

  React.useEffect(() => {
    if (ready && !child) router.replace('/cheder');
  }, [ready, child, router]);

  if (!ready || !child) return <div className="py-10" />;

  const doable = BLOCKS.filter((b) => b.kind !== 'off' && b.kind !== 'preview');
  const doneCount = doable.filter((b) => isDone(b.id)).length;
  const next = BLOCKS.find((b) => b.kind !== 'off' && b.kind !== 'preview' && !isDone(b.id));

  return (
    <div className="py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {heb.date}
            {heb.parsha && <> · {heb.parsha}</>}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
            {child.name}&apos;s day
          </h1>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">
            {doneCount}/{doable.length}
          </p>
          <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(doneCount / doable.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-2.5">
        {BLOCKS.map((block) => {
          const done = isDone(block.id);
          const isNext = next?.id === block.id;
          const Icon = block.icon;
          const inner = (
            <>
              <span className="w-11 shrink-0 pt-0.5 text-right text-sm font-semibold text-muted-foreground tabular-nums">
                {block.time}
              </span>
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: block.tint }}
              >
                {block.kind === 'off'
                  ? <MonitorOff className="size-5 text-foreground/60" />
                  : <Icon className="size-5 text-foreground/80" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={cn('truncate font-semibold', done && 'text-muted-foreground line-through decoration-border')}>
                    {block.title}
                  </span>
                  {(block.kind === 'live' || block.previewLive) && !done && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-destructive uppercase">
                      <span className="size-1.5 animate-pulse rounded-full bg-destructive" /> Live
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                  {block.sub}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 self-center">
                {done ? (
                  <span className="flex size-7 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Check className="size-4" />
                  </span>
                ) : isNext ? (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                    Up next
                  </span>
                ) : block.kind === 'off' ? (
                  <span className="text-xs font-medium text-muted-foreground">screens off</span>
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </span>
            </>
          );

          const cardCls = cn(
            'flex w-full items-start gap-3 rounded-3xl border bg-card p-3 text-left transition-colors',
            isNext ? 'border-primary/50 shadow-sm shadow-primary/10' : 'border-border',
            block.kind === 'off' && 'border-dashed bg-transparent',
          );

          if (block.kind === 'off') {
            return <div key={block.id} className={cardCls}>{inner}</div>;
          }
          if (block.href) {
            return (
              <Link key={block.id} href={block.href} className={cn(cardCls, 'hover:bg-muted/50')}>
                {inner}
              </Link>
            );
          }
          return (
            <button key={block.id} type="button" onClick={() => setPreview(block)} className={cn(cardCls, 'hover:bg-muted/50')}>
              {inner}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-card p-3.5 text-sm">
          <CalendarHeart className="size-5 shrink-0 text-primary" />
          <span><span className="font-semibold">Thursday 4:00</span> — your weekly 1:1 with your mashpia</span>
        </div>
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-card p-3.5 text-sm">
          <MapPin className="size-5 shrink-0 text-primary" />
          <span><span className="font-semibold">Sunday</span> — cheder meetup & raffle at Chabad of Atlanta</span>
        </div>
      </div>

      <Drawer open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DrawerContent>
          {preview && (
            <DrawerHeader className="pb-8 text-left">
              <span
                className="mb-2 flex size-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: preview.tint }}
              >
                <preview.icon className="size-6 text-foreground/80" />
              </span>
              <DrawerTitle className="font-serif text-2xl">{preview.title}</DrawerTitle>
              <DrawerDescription className="text-base">{preview.preview}</DrawerDescription>
              <p className="mt-3 inline-flex w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                Opens in the pilot — this demo shows the interactive lessons
              </p>
            </DrawerHeader>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
