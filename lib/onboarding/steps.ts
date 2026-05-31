// Ordered onboarding step machine.
// Mirrors the `onboarding_step` enum in Postgres.
//
// `signup` is the initial state right after Google sign-in.
// We advance through steps as the user submits each form.
// `community_choice` is skipped when the user already has an active membership
// (i.e. they accepted an invite, were seeded as admin, or were rabbi-added).

export const ONBOARDING_STEPS = [
  'identity',
  'family',
  'religious',
  'interests',
  'community_choice',
  'privacy',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

// Server-side enum value matches what we write to users.onboarding_step.
// 'signup' / 'tutorial' / 'done' aren't form steps but are valid states.
export type OnboardingState =
  | 'signup'
  | OnboardingStep
  | 'tutorial'
  | 'done';

export function nextStep(current: OnboardingStep, hasMembership: boolean): OnboardingState {
  if (current === 'interests' && hasMembership) return 'privacy';
  const i = ONBOARDING_STEPS.indexOf(current);
  return ONBOARDING_STEPS[i + 1] ?? 'done';
}

export function firstStepFor(state: OnboardingState): OnboardingStep {
  if (state === 'signup' || state === 'done' || state === 'tutorial') return 'identity';
  return state;
}

export const STEP_TITLES: Record<OnboardingStep, string> = {
  identity: 'Кто ты',
  family: 'Семья',
  religious: 'Религиозный профиль',
  interests: 'Интересы',
  community_choice: 'Община',
  privacy: 'Приватность',
};

/**
 * Clockout-style emotional meta per step.
 * Used by the new onboarding shell — big emoji + a question instead of a label,
 * + an optional tagline that sets emotional context.
 */
export type StepIcon = 'hand' | 'family' | 'flame' | 'sparkles' | 'building' | 'lock';

export interface StepMeta {
  icon: StepIcon;
  /** Big serif question, asked TO the user */
  question: string;
  /** Tagline under the question (optional) */
  tagline?: string;
  /** Background tint for this step's hero area */
  tint: 'yellow' | 'rose' | 'mint' | 'lavender' | 'sky' | 'cream';
}

export const STEP_META: Record<OnboardingStep, StepMeta> = {
  identity: {
    icon: 'hand',
    question: 'Давай знакомиться',
    tagline: 'Несколько базовых вопросов — и мы найдём твою общину.',
    tint: 'yellow',
  },
  family: {
    icon: 'family',
    question: 'Расскажи про семью',
    tagline: 'Это поможет подобрать программы и события — для детей, пар, родителей.',
    tint: 'rose',
  },
  religious: {
    icon: 'flame',
    question: 'Как у тебя с традицией?',
    tagline: 'Никакого осуждения. Любой ответ — ок. Это поможет показать релевантное.',
    tint: 'cream',
  },
  interests: {
    icon: 'sparkles',
    question: 'Что тебе близко?',
    tagline: 'Тора, шаббат, спорт, искусство… выбери что откликается.',
    tint: 'mint',
  },
  community_choice: {
    icon: 'building',
    question: 'Найди свою общину',
    tagline: 'Открой карту или подай заявку напрямую раввину.',
    tint: 'sky',
  },
  privacy: {
    icon: 'lock',
    question: 'Кто видит твой профиль?',
    tagline: 'Можешь поменять в любой момент в настройках.',
    tint: 'lavender',
  },
};
