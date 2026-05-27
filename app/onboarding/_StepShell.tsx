import { ONBOARDING_STEPS, STEP_TITLES, type OnboardingStep } from '@/lib/onboarding/steps';

interface StepShellProps {
  step: OnboardingStep;
  hasMembership: boolean;
  children: React.ReactNode;
}

export function StepShell({ step, hasMembership, children }: StepShellProps) {
  // Filter out community_choice if user already has a membership
  const visibleSteps = ONBOARDING_STEPS.filter(
    (s) => s !== 'community_choice' || !hasMembership,
  );
  const currentIdx = visibleSteps.indexOf(step);
  const total = visibleSteps.length;
  const progress = ((currentIdx + 1) / total) * 100;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="font-serif text-xl font-semibold">Menorah Global</div>
          <div className="text-sm text-(--color-muted)">
            Шаг {currentIdx + 1} из {total}
          </div>
        </div>
        <div className="h-1 bg-(--color-muted-bg)">
          <div
            className="h-full bg-(--color-gold) transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-serif text-3xl font-semibold mb-2">{STEP_TITLES[step]}</h1>
          <p className="text-(--color-muted) text-sm mb-8">
            {currentIdx + 1 < total
              ? 'Шаг ' + (currentIdx + 1) + ' из ' + total + ' — можешь вернуться позже.'
              : 'Последний шаг.'}
          </p>
          {children}
        </div>
      </main>
    </div>
  );
}
