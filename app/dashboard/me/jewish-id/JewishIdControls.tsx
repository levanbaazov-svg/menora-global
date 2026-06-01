'use client';

import { useActionState, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { regenerateJewishIdToken, toggleJewishIdEnabled } from './_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Button } from '@/app/_components/ui/Button';
import { LOCALE_BCP47, type Locale } from '@/i18n/config';

export function JewishIdControls({
  enabled,
  regeneratedAt,
}: {
  enabled: boolean;
  regeneratedAt: string | null;
}) {
  const t = useTranslations('personal');
  const locale = useLocale() as Locale;
  const [toggleState, toggleAction, togglePending] = useActionState(toggleJewishIdEnabled, INITIAL_STATE);
  const [regenState, regenAction, regenPending] = useActionState(regenerateJewishIdToken, INITIAL_STATE);
  const [confirmRegen, setConfirmRegen] = useState(false);

  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-widest text-(--color-fg-muted)">
        {t('jewishId.controls.title')}
      </h3>

      {/* Enable / disable */}
      <form action={toggleAction}>
        <input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} />
        <Button
          type="submit"
          variant={enabled ? 'ghost' : 'gold'}
          size="md"
          fullWidth
          disabled={togglePending}
        >
          {togglePending
            ? '...'
            : enabled
              ? t('jewishId.controls.disable')
              : t('jewishId.controls.enable')}
        </Button>
        {toggleState.formError && (
          <p className="text-xs text-red-600 mt-1">{toggleState.formError}</p>
        )}
      </form>

      {/* Regenerate token */}
      {enabled && (
        <>
          {!confirmRegen ? (
            <Button
              type="button"
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => setConfirmRegen(true)}
            >
              {t('jewishId.controls.regenerate')}
            </Button>
          ) : (
            <form action={regenAction} className="space-y-2">
              <div className="text-xs text-(--color-fg-muted) leading-relaxed">
                {t('jewishId.controls.regenerateWarning')}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button" variant="ghost" size="sm"
                  onClick={() => setConfirmRegen(false)}
                  disabled={regenPending}
                  fullWidth
                >
                  {t('jewishId.controls.cancel')}
                </Button>
                <Button type="submit" variant="danger" size="sm" disabled={regenPending} fullWidth>
                  {regenPending ? '...' : t('jewishId.controls.confirmRegenerate')}
                </Button>
              </div>
              {regenState.formError && (
                <p className="text-xs text-red-600">{regenState.formError}</p>
              )}
            </form>
          )}

          {regeneratedAt && (
            <p className="text-[10px] text-(--color-fg-subtle) leading-relaxed">
              {t('jewishId.controls.regeneratedAt', {
                date: new Date(regeneratedAt).toLocaleString(LOCALE_BCP47[locale], {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                }),
              })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
