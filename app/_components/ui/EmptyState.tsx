import type { ReactNode } from 'react';

interface Props {
  emoji?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Variant changes the visual treatment. Default is dashed-border block. */
  variant?: 'dashed' | 'soft';
}

export function EmptyState({
  emoji = '✦', title, description, action, variant = 'dashed',
}: Props) {
  const isDashed = variant === 'dashed';
  return (
    <div className={`
      ${isDashed
        ? 'border-2 border-dashed border-(--color-border) bg-(--color-bg-elevated)/40'
        : 'bg-gradient-to-br from-(--color-pastel-cream) to-(--color-bg-elevated) border border-(--color-border)/60 shadow-[var(--shadow-sm)]'}
      rounded-2xl p-10 text-center max-w-md mx-auto fade-up
    `}>
      <div className="text-5xl mb-4 opacity-60 float inline-block">{emoji}</div>
      <h3 className="font-serif text-xl font-semibold mb-2 leading-tight">{title}</h3>
      {description && (
        <p className="text-sm text-(--color-fg-muted) mb-5 leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
