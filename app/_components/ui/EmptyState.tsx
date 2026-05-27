import type { ReactNode } from 'react';

interface Props {
  emoji?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ emoji = '✦', title, description, action }: Props) {
  return (
    <div className="border-2 border-dashed border-(--color-border) rounded-2xl p-10 text-center max-w-md mx-auto">
      <div className="text-5xl mb-4 opacity-50">{emoji}</div>
      <h3 className="font-serif text-xl font-semibold mb-2">{title}</h3>
      {description && <p className="text-sm text-(--color-fg-muted) mb-5">{description}</p>}
      {action}
    </div>
  );
}
