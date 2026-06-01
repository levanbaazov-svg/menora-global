// Clockout-inspired onboarding shell: one question per screen, emotional copy,
// warm hero with emoji "subject", progress dots instead of a bar, soft back/skip.

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Hand, Users, Flame, Sparkles, Building2, Lock, type LucideIcon } from 'lucide-react';
import {
  ONBOARDING_STEPS, STEP_META,
  type OnboardingStep, type StepIcon,
} from '@/lib/onboarding/steps';

const STEP_ICON: Record<StepIcon, LucideIcon> = {
  hand: Hand, family: Users, flame: Flame, sparkles: Sparkles, building: Building2, lock: Lock,
};

interface StepShellProps {
  step: OnboardingStep;
  hasMembership: boolean;
  children: React.ReactNode;
}

const TINT_BG: Record<string, string> = {
  yellow:   'from-amber-100 via-amber-50 to-orange-50',
  rose:     'from-rose-100 via-pink-50 to-rose-50',
  mint:     'from-emerald-100 via-teal-50 to-emerald-50',
  lavender: 'from-violet-100 via-purple-50 to-indigo-50',
  sky:      'from-sky-100 via-blue-50 to-cyan-50',
  cream:    'from-amber-50 via-yellow-50 to-orange-50',
};

export async function StepShell({ step, hasMembership, children }: StepShellProps) {
  const t = await getTranslations('miscChrome');
  const visibleSteps = ONBOARDING_STEPS.filter(
    (s) => s !== 'community_choice' || !hasMembership,
  );
  const currentIdx = visibleSteps.indexOf(step);
  const total = visibleSteps.length;

  const meta = STEP_META[step];
  const tintClass = TINT_BG[meta.tint];
  const prevStep = currentIdx > 0 ? visibleSteps[currentIdx - 1] : null;
  const question = t.has(`steps.${step}.question`) ? t(`steps.${step}.question`) : meta.question;
  const tagline = meta.tagline
    ? (t.has(`steps.${step}.tagline`) ? t(`steps.${step}.tagline`) : meta.tagline)
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-(--color-bg)">
      {/* Top bar — minimal, brand-only */}
      <header className="px-5 md:px-6 pt-5 md:pt-6 safe-top relative z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Back chevron */}
          {prevStep ? (
            <Link
              href={`/onboarding/${prevStep}`}
              aria-label={t('back')}
              className="w-10 h-10 -ml-2 inline-flex items-center justify-center text-(--color-fg-muted) hover:text-(--color-deep) hover:bg-(--color-bg-muted) rounded-full transition-all"
            >
              <span className="inline-block rtl:-scale-x-100">←</span>
            </Link>
          ) : (
            <span className="w-10 h-10" />
          )}

          {/* Brand */}
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-(--color-gold) text-base">✦</span>
            <span className="font-serif italic text-base font-semibold tracking-tight">
              Menorah
            </span>
          </Link>

          {/* Step counter */}
          <span className="text-xs text-(--color-fg-muted) font-mono tabular-nums">
            {currentIdx + 1}/{total}
          </span>
        </div>

        {/* Progress dots — softer than a bar */}
        <div className="max-w-2xl mx-auto mt-5 flex items-center justify-center gap-1.5">
          {visibleSteps.map((s, i) => (
            <span
              key={s}
              aria-hidden
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i < currentIdx
                  ? 'w-1.5 bg-(--color-gold-dark)'
                  : i === currentIdx
                    ? 'w-8 bg-(--color-gold)'
                    : 'w-1.5 bg-(--color-border-strong)'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Hero — emoji + emotional question */}
      <section className="px-5 md:px-6 pt-10 md:pt-14 pb-8 relative overflow-hidden">
        {/* Soft tinted background blob behind the emoji */}
        <div
          aria-hidden
          className={`absolute inset-x-0 top-0 h-72 -z-10 bg-gradient-to-b ${tintClass} opacity-60`}
        />
        <div className="max-w-xl mx-auto text-center fade-up">
          <div className="mb-5 inline-flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-3xl bg-white shadow-[0_8px_24px_-6px_rgba(20,24,31,0.16)] ring-1 ring-black/[0.03] float">
            {(() => { const Icon = STEP_ICON[meta.icon]; return <Icon className="text-(--color-gold-dark)" size={34} strokeWidth={1.7} />; })()}
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-[1.1] tracking-tight mb-3">
            {question}
          </h1>
          {tagline && (
            <p className="text-base text-(--color-fg-muted) max-w-md mx-auto leading-relaxed">
              {tagline}
            </p>
          )}
        </div>
      </section>

      {/* Form body */}
      <main className="flex-1 px-5 md:px-6 pb-16">
        <div className="max-w-md mx-auto fade-up" style={{ animationDelay: '120ms' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
