'use client';

import { useOptimistic, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { setCheckin } from './_actions';
import { Check } from 'lucide-react';

export function CheckinToggle({
  routineId,
  checked,
}: {
  routineId: string;
  checked: boolean;
}) {
  const t = useTranslations('engageMisc');
  const [optimisticChecked, setOptimistic] = useOptimistic(checked);

  return (
    <button
      type="button"
      aria-label={optimisticChecked ? t('routine.cancel') : t('routine.mark')}
      onClick={() => {
        startTransition(async () => {
          setOptimistic(!optimisticChecked);
          await setCheckin(routineId, !optimisticChecked);
        });
      }}
      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 ${
        optimisticChecked
          ? 'bg-primary text-primary-foreground shadow-[var(--shadow-gold)]'
          : 'border-2 border-border hover:border-primary/50'
      }`}
    >
      {optimisticChecked && <Check size={16} strokeWidth={3} />}
    </button>
  );
}
