'use client';

// Animated streak stats header for the routines page.
// Count-up numbers via motion. Fire icon pulses when streak is active.

import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { useEffect } from 'react';
import { Flame, Trophy, CalendarCheck, CircleCheck } from 'lucide-react';

function CountUp({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [value, mv]);
  return <motion.span>{rounded}</motion.span>;
}

export function StreakHeader({
  current, longest, totalCheckins, doneToday, totalToday,
}: {
  current: number;
  longest: number;
  totalCheckins: number;
  doneToday: number;
  totalToday: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {/* Big current streak */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="col-span-2 relative overflow-hidden rounded-2xl p-4 text-background bg-gradient-to-br from-orange-500 to-amber-500"
      >
        <div
          aria-hidden
          className="absolute -top-10 -right-8 w-40 h-40 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
        />
        <div className="relative flex items-center gap-3">
          <motion.div
            animate={current > 0 ? { scale: [1, 1.12, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="shrink-0"
          >
            <Flame size={36} strokeWidth={2} className="drop-shadow" />
          </motion.div>
          <div>
            <div className="text-3xl font-bold leading-none tabular-nums">
              <CountUp value={current} />
              <span className="text-lg font-semibold ml-1">
                {current === 1 ? 'день' : current >= 2 && current <= 4 ? 'дня' : 'дней'}
              </span>
            </div>
            <div className="text-xs text-background/85 mt-1">
              {current > 0 ? 'Серия продолжается — не прерывай!' : 'Начни новую серию сегодня'}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-sm font-semibold tabular-nums">{doneToday}/{totalToday}</div>
            <div className="text-[10px] text-background/80 uppercase tracking-wide">сегодня</div>
          </div>
        </div>
      </motion.div>

      <StatCard Icon={Trophy} value={longest} label="Рекорд" tint="text-amber-600 bg-amber-50" delay={0.06} />
      <StatCard Icon={CircleCheck} value={totalCheckins} label="Всего отметок" tint="text-emerald-600 bg-emerald-50" delay={0.1} />
    </div>
  );
}

function StatCard({
  Icon, value, label, tint, delay,
}: {
  Icon: typeof Trophy; value: number; label: string; tint: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl bg-card ring-1 ring-border/70 p-3.5"
    >
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg mb-2 ${tint}`}>
        <Icon size={16} strokeWidth={2} />
      </div>
      <div className="text-xl font-bold leading-none tabular-nums">
        <CountUp value={value} />
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
    </motion.div>
  );
}
