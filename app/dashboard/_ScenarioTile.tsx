// Lovable-style pastel scenario tile (NO emoji — lucide arrow corner badge).
// Used on dashboard home for the 6 AI Rabbi scenarios.

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export type ScenarioTint = 'yellow' | 'lavender' | 'mint' | 'rose' | 'sky' | 'cream';

const TINT_CLASS: Record<ScenarioTint, string> = {
  yellow:   'bg-[oklch(0.95_0.06_90)]',
  lavender: 'bg-[oklch(0.92_0.05_295)]',
  mint:     'bg-[oklch(0.93_0.05_160)]',
  rose:     'bg-[oklch(0.92_0.05_25)]',
  sky:      'bg-[oklch(0.93_0.04_230)]',
  cream:    'bg-[oklch(0.95_0.04_50)]',
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: 0.04 * index }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        href={href}
        className={`
          group block relative rounded-2xl p-4 min-h-[120px]
          ${TINT_CLASS[tint]}
          overflow-hidden
          shadow-[0_1px_2px_rgba(20,24,31,0.04)]
          transition-shadow duration-200
          hover:shadow-[0_8px_24px_-4px_rgba(20,24,31,0.10)]
        `}
      >
        <div className="relative pr-8">
          <h3 className="font-serif text-base font-semibold leading-tight tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[12px] text-foreground/65 mt-1 leading-snug">{subtitle}</p>
          )}
        </div>

        {/* corner arrow — pure dark circle like Lovable */}
        <div
          className="
            absolute right-3 bottom-3
            inline-flex items-center justify-center
            w-8 h-8 rounded-full bg-foreground text-background
            shadow-sm
            transition-transform duration-300
            group-hover:-translate-y-0.5 group-hover:translate-x-0.5
          "
        >
          <ArrowUpRight size={14} strokeWidth={2.2} />
        </div>
      </Link>
    </motion.div>
  );
}
