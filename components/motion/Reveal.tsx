'use client';

// Generic reveal-on-mount wrapper. Optionally staggers children
// when used with <Reveal.Stagger>.

import { motion, type HTMLMotionProps } from 'motion/react';
import { Children, isValidElement, cloneElement } from 'react';

interface Props extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'transition'> {
  delay?: number;
  y?: number;
  duration?: number;
}

export function Reveal({ children, delay = 0, y = 8, duration = 0.4, ...rest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

interface StaggerProps {
  children: React.ReactNode;
  delayStart?: number;
  step?: number;
  y?: number;
  className?: string;
}

/**
 * Stagger immediate children with a small delay between each.
 * Wraps each child in a motion.div, so children don't need to be motion components.
 */
export function StaggerChildren({
  children, delayStart = 0, step = 0.05, y = 8, className,
}: StaggerProps) {
  return (
    <div className={className}>
      {Children.map(children, (child, i) => {
        if (!isValidElement(child)) return child;
        return (
          <motion.div
            initial={{ opacity: 0, y }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: delayStart + i * step,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {child}
          </motion.div>
        );
      })}
    </div>
  );
}
