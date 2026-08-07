'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { BookMarked, Car, Gift, HeartHandshake, Pizza, Ticket, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LessonShell } from '../_components/lesson';
import { useCheder } from '../_components/state';

const ITEMS = [
  { name: 'Pizza party with the class', cost: 25, icon: Pizza, tint: 'var(--ch-amber-soft)', fg: 'var(--ch-amber)' },
  { name: 'Seforim set (mailed home)', cost: 40, icon: BookMarked, tint: 'var(--ch-blue-soft)', fg: 'var(--ch-blue)' },
  { name: 'Remote-control car', cost: 60, icon: Car, tint: 'var(--ch-teal-soft)', fg: 'var(--ch-teal)' },
  {
    name: 'Give tzedakah — the cheder matches it',
    cost: 10,
    icon: HeartHandshake,
    tint: 'var(--ch-rose-soft)',
    fg: 'var(--ch-rose)',
    tzedakah: true,
  },
];

export default function StorePage() {
  const { tickets, raffleEntries, spendTickets, enterRaffle } = useCheder();

  return (
    <LessonShell
      accent={{ main: 'var(--ch-amber)', soft: 'var(--ch-amber-soft)' }}
      chip="Cheder store"
      title="My tickets"
      subtitle="Earned for mastered units, streaks, chavrusa and davening skills"
    >
      <div className="flex items-center justify-between rounded-3xl border border-[var(--ch-amber)]/40 bg-[var(--ch-amber-soft)] p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-card">
            <Ticket className="size-6 text-[var(--ch-amber)]" />
          </span>
          <div>
            <p className="font-serif text-3xl font-semibold tabular-nums">{tickets}</p>
            <p className="text-xs font-medium text-muted-foreground">tickets to spend</p>
          </div>
        </div>
        <Gift className="size-8 text-[var(--ch-amber)]/50" />
      </div>

      <div className="mt-4 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-serif text-lg font-semibold">
              <Trophy className="size-5 text-[var(--ch-amber)]" /> Rosh Chodesh Raffle
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Drawn <span className="font-semibold text-foreground">live this Sunday</span> at the
              Chabad of Atlanta meetup. Grand prize: LEGO set.
            </p>
          </div>
          {raffleEntries > 0 && (
            <span className="shrink-0 rounded-full bg-[var(--ch-amber-soft)] px-2.5 py-1 text-xs font-bold text-[var(--ch-amber)]">
              {raffleEntries} {raffleEntries === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>
        <Button
          size="lg"
          variant="outline"
          className="mt-3 h-11 w-full rounded-2xl"
          onClick={() => {
            if (enterRaffle(5)) toast.success('You’re in the Sunday raffle. Hatzlacha!');
            else toast.error('Not enough tickets yet — finish a unit first.');
          }}
        >
          Enter for 5 <Ticket className="size-4" />
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const affordable = tickets >= item.cost;
          return (
            <div key={item.name} className="flex flex-col rounded-3xl border border-border bg-card p-4">
              <span className="flex size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: item.tint }}>
                <Icon className="size-5" style={{ color: item.fg }} />
              </span>
              <p className="mt-3 text-sm font-semibold leading-snug">{item.name}</p>
              <Button
                size="sm"
                variant={affordable ? 'default' : 'outline'}
                disabled={!affordable}
                className="mt-3 w-full rounded-xl"
                onClick={() => {
                  if (spendTickets(item.cost)) {
                    toast.success(
                      item.tzedakah
                        ? 'Tzedakah given — and the cheder matched it. Double mitzvah!'
                        : `${item.name} — on its way!`,
                    );
                  }
                }}
              >
                {item.cost} <Ticket className="size-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        The same tickets-and-raffle every cheder runs — digitized, counted automatically, drawn
        live so everyone shows up.
      </p>
    </LessonShell>
  );
}
