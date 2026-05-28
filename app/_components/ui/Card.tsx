import Link from 'next/link';
import type { ReactNode, ComponentProps } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  href?: string;
  onClick?: () => void;
}

const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

// Unified card surface across the app.
const baseClass =
  'bg-(--color-bg-elevated) border border-(--color-border)/70 rounded-2xl ' +
  'shadow-[var(--shadow-sm)] transition-all duration-200';

const interactiveClass =
  'hover:border-(--color-gold)/40 hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] ' +
  'active:translate-y-0 active:shadow-[var(--shadow-sm)]';

export function Card({ children, className = '', padding = 'md', interactive, href, onClick }: CardProps) {
  const cls = `${baseClass} ${PADDING[padding]} ${interactive || href ? interactiveClass + ' cursor-pointer' : ''} ${className}`;
  if (href) {
    return <Link href={href} className={cls}>{children}</Link>;
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} text-left w-full`}>
        {children}
      </button>
    );
  }
  return <div className={cls}>{children}</div>;
}

/** Photo card — full-bleed image with white text overlay (Lovable style) */
export function PhotoCard({
  imageUrl, gradientColor, badge, title, subtitle, children, href, className = '',
  aspect = 'square',
}: {
  imageUrl?: string;
  gradientColor?: string;
  badge?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  href?: string;
  className?: string;
  aspect?: 'square' | 'portrait' | 'landscape' | 'video';
}) {
  const aspectClass = aspect === 'portrait' ? 'aspect-[3/4]'
                    : aspect === 'landscape' ? 'aspect-[4/3]'
                    : aspect === 'video' ? 'aspect-video'
                    : 'aspect-square';

  const inner = (
    <div className={`relative overflow-hidden rounded-2xl ${aspectClass} photo-overlay ${className}`}
         style={{
           background: imageUrl
             ? `url(${imageUrl}) center/cover no-repeat`
             : gradientColor ?? 'linear-gradient(135deg, #C7A862, #8F6A1F)',
         }}>
      {badge && (
        <div className="absolute top-3 left-3 z-10">{badge}</div>
      )}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 text-white">
        {title && <div className="font-serif text-xl font-semibold leading-tight drop-shadow-md">{title}</div>}
        {subtitle && <div className="text-sm opacity-90 mt-1">{subtitle}</div>}
        {children}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block transition-transform duration-200 hover:scale-[1.015] active:scale-[0.99]">
      {inner}
    </Link>
  ) : inner;
}

/** Pastel scenario card — used on AI Rabbi home */
export function PastelCard({
  tint, title, subtitle, href, onClick, className = '',
}: {
  tint: 'yellow' | 'lavender' | 'mint' | 'rose' | 'sky' | 'cream';
  title: ReactNode;
  subtitle?: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const tintBg = `bg-[var(--color-pastel-${tint})]`;

  const content = (
    <div className={`group relative rounded-2xl p-5 min-h-[140px] flex flex-col justify-between
                     ${tintBg} overflow-hidden
                     hover:shadow-[var(--shadow-md)]
                     transition-all duration-200 ${className}`}>
      {/* Subtle radial glow on hover */}
      <div
        aria-hidden
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-300"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%)' }}
      />
      <div className="relative">
        <div className="font-serif text-lg font-semibold leading-tight">{title}</div>
        {subtitle && <div className="text-xs text-(--color-fg-muted) mt-1">{subtitle}</div>}
      </div>
      <div className="relative self-start w-9 h-9 rounded-full bg-(--color-deep) text-white flex items-center justify-center text-sm transition-transform duration-200 group-hover:translate-x-1">
        →
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  if (onClick) {
    return <button type="button" onClick={onClick} className="text-left w-full">{content}</button>;
  }
  return content;
}

/** Chip — pill badge or filter */
export function Chip({
  children, tone = 'neutral', size = 'sm', className = '',
  ...rest
}: {
  children: ReactNode;
  tone?: 'neutral' | 'gold' | 'soft-gold' | 'green' | 'red' | 'blue' | 'dark';
  size?: 'xs' | 'sm' | 'md';
} & ComponentProps<'span'>) {
  const tones = {
    neutral:   'bg-(--color-muted-bg) text-(--color-fg-muted)',
    gold:      'bg-(--color-gold) text-(--color-deep)',
    'soft-gold': 'bg-(--color-gold-soft) text-(--color-gold-dark)',
    green:     'bg-(--color-success-soft) text-(--color-success)',
    red:       'bg-(--color-danger-soft) text-(--color-danger)',
    blue:      'bg-(--color-info-soft) text-(--color-info)',
    dark:      'bg-(--color-deep) text-white',
  };
  const sizes = {
    xs: 'text-[10px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
  };
  return (
    <span {...rest} className={`inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap ${tones[tone]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}

/** Section — consistent vertical rhythm + header for content blocks */
export function Section({
  title, subtitle, action, children, className = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-10 ${className}`}>
      {(title || subtitle || action) && (
        <header className="mb-4 flex items-end justify-between gap-3">
          <div>
            {title && (
              <h2 className="font-serif text-xl md:text-2xl font-semibold leading-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-(--color-fg-muted) mt-1">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
