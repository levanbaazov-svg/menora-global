import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'gold' | 'dark' | 'ghost' | 'soft' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'pill';

const VARIANTS: Record<Variant, string> = {
  gold:   'bg-(--color-gold) text-(--color-deep) hover:opacity-90 hover:scale-[1.01] shadow-[var(--shadow-gold)]',
  dark:   'bg-(--color-deep) text-white hover:opacity-90',
  ghost:  'border border-(--color-border) hover:border-(--color-gold) hover:bg-(--color-muted-bg)',
  soft:   'bg-(--color-muted-bg) text-(--color-deep) hover:bg-(--color-gold-soft)',
  danger: 'border border-(--color-border) text-(--color-fg) hover:border-red-300 hover:bg-red-50 hover:text-red-700',
};

const SIZES: Record<Size, string> = {
  sm:   'h-9 px-4 text-sm rounded-full',
  md:   'h-11 px-5 text-sm rounded-full',
  lg:   'h-13 px-7 text-base rounded-full',
  pill: 'h-11 px-6 text-sm rounded-full',
};

interface BaseProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 ' +
  'disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-(--color-gold)/40';

export function Button({
  variant = 'dark', size = 'md', fullWidth, leadingIcon, trailingIcon,
  children, className = '', ...rest
}: BaseProps & Omit<ComponentProps<'button'>, 'children'>) {
  return (
    <button
      {...rest}
      className={`${baseClasses} ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
      <span>{children}</span>
      {trailingIcon && <span className="shrink-0">{trailingIcon}</span>}
    </button>
  );
}

export function LinkButton({
  variant = 'dark', size = 'md', fullWidth, leadingIcon, trailingIcon,
  children, className = '', href, ...rest
}: BaseProps & { href: string } & Omit<ComponentProps<typeof Link>, 'href' | 'children'>) {
  return (
    <Link
      href={href}
      {...rest}
      className={`${baseClasses} ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
      <span>{children}</span>
      {trailingIcon && <span className="shrink-0">{trailingIcon}</span>}
    </Link>
  );
}
