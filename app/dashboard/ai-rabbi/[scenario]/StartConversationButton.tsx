'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { startConversation } from '../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Button } from '@/app/_components/ui/Button';

export function StartConversationButton({ scenarioSlug }: { scenarioSlug: string }) {
  const [state, action, pending] = useActionState(startConversation, INITIAL_STATE);
  const t = useTranslations('aiMisc');
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="scenario" value={scenarioSlug} />
      <Button type="submit" variant="gold" size="lg" fullWidth disabled={pending}>
        {pending ? t('opening') : t('startConversation')}
      </Button>
      {state.formError && (
        <p className="text-xs text-red-600 text-center">{state.formError}</p>
      )}
    </form>
  );
}
