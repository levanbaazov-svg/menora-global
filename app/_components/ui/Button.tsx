import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'gold' | 'dark' | 'ghost' | 'soft' | 'danger' | 'glass';
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'pill';

const VARIANTS: Record<Variant, string> = {
  gold:   'bg-(--color-gold) text-(--color-deep) hover:opacity-95 active:scale-[0.98] shadow-[var(--shadow-gold)] hover:shadow-[var(--shadow-lg)]',
  dark:   'bg-(--color-deep) text-white hover:bg-(--color-deep-soft) active:scale-[0.98] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]',
  ghost:  'border border-(--color-border) hover:border-(--color-gold)/50 hover:bg-(--color-muted-bg) active:scale-[0.98]',
  soft:   'bg-(--color-muted-bg) text-(--color-deep) hover:bg-(--color-gold-soft) active:scale-[0.98]',
  danger: 'border border-(--color-border) text-(--color-fg) hover:border-(--color-danger)/30 hover:bg-(--color-danger-soft)/50 hover:text-(--color-danger) active:scale-[0.98]',
  glass:  'glass border border-white/30 text-(--color-deep) hover:bg-white/90 active:scale-[0.98]',
};

const SIZES: Record<Size, string> = {
  sm:   'h-9 px-4 text-sm rounded-full',
  md:   'h-11 px-5 text-sm rounded-full',
  lg:   'h-13 px-7 text-base rounded-full',
  xl:   'h-14 px-8 text-base rounded-full',
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
  'inline-flex items-center justify-center gap-2 font-semibold ' +
  'transition-all duration-200 select-none ' +
  'disabled:opacity-50 disabled:pointer-events-none ' +
  'focus-visible:outline-(--color-gold) focus-visible:outline-offset-2';

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
