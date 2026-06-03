'use client';

// Subtle page transition wrapper. Wraps each route's content in
// a motion.div that fades + rises gently on mount.
//
// Apple-style: short duration, no exaggerated motion. Respects
// prefers-reduced-motion automatically via the motion config.

import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
