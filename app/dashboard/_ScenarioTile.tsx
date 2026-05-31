'use client';

// Lovable-style pastel scenario tile — light gradient tints, compact.
// NO emoji — lucide arrow corner badge.

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export type ScenarioTint = 'yellow' | 'lavender' | 'mint' | 'rose' | 'sky' | 'cream';

// Soft diagonal gradients — lighter than flat fills, closer to the prototype.
const TINT_GRADIENT: Record<ScenarioTint, string> = {
  yellow:   'linear-gradient(135deg, oklch(0.975 0.03 95), oklch(0.945 0.07 88))',
  lavender: 'linear-gradient(135deg, oklch(0.97 0.025 300), oklch(0.93 0.05 295))',
  mint:     'linear-gradient(135deg, oklch(0.975 0.03 165), oklch(0.94 0.055 160))',
  rose:     'linear-gradient(135deg, oklch(0.975 0.025 20), oklch(0.94 0.05 22))',
  sky:      'linear-gradient(135deg, oklch(0.975 0.025 235), oklch(0.94 0.045 232))',
  cream:    'linear-gradient(135deg, oklch(0.98 0.02 60), oklch(0.95 0.045 52))',
};

interface Props {
  href: string;
  title: ReactNode;
  subtitle?: ReactNode;
  tint: ScenarioTint;
  index?: number;
}

export function ScenarioTile({ href, title, subtitle, tint, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.03 * index }}
      whileTap={{ scale: 0.97 }}
    >
      <Link
        href={href}
        style={{ backgroundImage: TINT_GRADIENT[tint] }}
        className="
          group flex items-center justify-between gap-2 rounded-[20px] px-3.5 py-3
          min-h-[76px]
          shadow-[0_1px_3px_rgba(20,24,31,0.05)]
          transition-shadow duration-200
          hover:shadow-[0_6px_18px_-4px_rgba(20,24,31,0.12)]
        "
      >
        <div className="min-w-0">
          <h3 className="font-serif text-[15px] font-semibold leading-[1.15] tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-foreground/55 mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>

        {/* corner arrow */}
        <div
          className="
            shrink-0 inline-flex items-center justify-center
            w-7 h-7 rounded-full bg-foreground/90 text-background
            transition-transform duration-300
            group-hover:-translate-y-0.5 group-hover:translate-x-0.5
          "
        >
          <ArrowUpRight size={13} strokeWidth={2.4} />
        </div>
      </Link>
    </motion.div>
  );
}
