'use client';

import { useActionState } from 'react';
import { enrollProgram } from '../../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export function EnrollButton({
  programId, enrolled, enrollmentStatus, registrationOpen, isFull, externalUrl,
}: {
  programId: string;
  enrolled: boolean;
  enrollmentStatus: string | null;
  registrationOpen: boolean;
  isFull: boolean;
  externalUrl: string | null;
}) {
  const [state, action, pending] = useActionState(enrollProgram, INITIAL_STATE);

  // Already enrolled
  if (enrolled || state.ok) {
    const label = enrollmentStatus === 'pending' ? 'Заявка отправлена' : 'Вы записаны';
    return (
      <Button disabled variant="secondary" size="lg" className="w-full rounded-full h-13 gap-2">
        <Check size={18} /> {label}
      </Button>
    );
  }

  // External registration
  if (externalUrl) {
    return (
      <Button asChild size="lg" className="w-full rounded-full h-13">
        <a href={externalUrl} target="_blank" rel="noopener noreferrer">Записаться на сайте</a>
      </Button>
    );
  }

  if (isFull) {
    return (
      <Button disabled variant="secondary" size="lg" className="w-full rounded-full h-13">
        Мест нет
      </Button>
    );
  }

  if (!registrationOpen) {
    return (
      <Button disabled variant="secondary" size="lg" className="w-full rounded-full h-13">
        Запись закрыта
      </Button>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="program_id" value={programId} />
      <Button type="submit" size="lg" disabled={pending} className="w-full rounded-full h-13">
        {pending ? 'Записываю…' : 'Записаться'}
      </Button>
      {state.formError && (
        <p className="text-xs text-destructive mt-2 text-center">{state.formError}</p>
      )}
    </form>
  );
}
