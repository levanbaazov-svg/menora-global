'use client';

// Демо-панель пожертвования: выбор суммы (кратной 18) + кнопка.
// Реальных платежей нет — по нажатию показываем благодарность с пометкой
// «демо»; платёжный провайдер подключается на этапе запуска.

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { HandCoins, Heart } from 'lucide-react';
import { SUGGESTED_AMOUNTS, formatUah } from '@/lib/tzedakah/campaigns';

export function DonatePanel({ disabled }: { disabled?: boolean }) {
  const t = useTranslations('tzedakah');
  const [amount, setAmount] = useState<number>(SUGGESTED_AMOUNTS[1]);
  const [thanked, setThanked] = useState(false);

  if (disabled) return null;

  if (thanked) {
    return (
      <div className="rounded-2xl bg-primary/8 border border-primary/25 p-5 text-center">
        <Heart size={22} strokeWidth={2} className="mx-auto text-primary mb-2" />
        <div className="font-serif text-base font-semibold">{t('thanksTitle')}</div>
        <p className="text-xs text-muted-foreground mt-1">{t('thanksDemo')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card ring-1 ring-border/70 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2.5">
        {t('chooseAmount')}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {SUGGESTED_AMOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAmount(a)}
            className={`rounded-xl px-2 py-2.5 text-sm font-semibold tabular-nums transition-colors ${
              amount === a
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground/75 hover:bg-muted/70'
            }`}
          >
            {formatUah(a)}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">{t('chaiNote')}</p>
      <button
        type="button"
        onClick={() => setThanked(true)}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm py-3 hover:opacity-90 transition-opacity"
      >
        <HandCoins size={16} strokeWidth={2.1} />
        {t('donate', { amount: formatUah(amount) })}
      </button>
    </div>
  );
}
