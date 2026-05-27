// Placeholder until Phase B (real GPT-4o-mini integration).
// Each scenario route lands here with a contextual coming-soon card.

import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

const SCENARIOS: Record<string, { emoji: string; title: string; teaser: string; tint: string }> = {
  purpose: {
    emoji: '🌟',
    title: 'Найти себя',
    teaser: 'Глубокий разговор о смысле, целях, направлении жизни через призму еврейской мудрости.',
    tint: 'var(--color-pastel-yellow)',
  },
  shabbat: {
    emoji: '🕯',
    title: 'Спланировать Шаббат',
    teaser: 'AI поможет найти ужин рядом, забронировать место, спланировать дома или у друзей.',
    tint: 'var(--color-pastel-lavender)',
  },
  'hebrew-school': {
    emoji: '👶',
    title: 'Hebrew School',
    teaser: 'Подберём подходящую школу для твоих детей в твоём городе. Поможем с записью.',
    tint: 'var(--color-pastel-mint)',
  },
  parsha: {
    emoji: '📚',
    title: 'Парша недели',
    teaser: '5-минутная мудрость каждый день — главные идеи недельной главы простым языком.',
    tint: 'var(--color-pastel-rose)',
  },
  'meet-people': {
    emoji: '🤝',
    title: 'Найти своих',
    teaser: 'AI подберёт людей в общине с похожими интересами и поможет начать разговор.',
    tint: 'var(--color-pastel-sky)',
  },
  struggling: {
    emoji: '💙',
    title: 'Мне тяжело',
    teaser: 'Безопасное пространство для разговора. Поможем разобраться, услышать, поддержать.',
    tint: 'var(--color-pastel-cream)',
  },
};

export default async function ScenarioPage({ params }: { params: Promise<{ scenario: string }> }) {
  const { scenario } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const s = SCENARIOS[scenario];
  if (!s) notFound();

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-6 pt-6 pb-12">
      <Link
        href="/dashboard"
        className="inline-block text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-6"
      >
        ← Назад на главную
      </Link>

      {/* Hero */}
      <div
        className="rounded-3xl p-8 md:p-10 mb-6 text-center fade-up"
        style={{ background: s.tint }}
      >
        <div className="text-6xl mb-4">{s.emoji}</div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-3">{s.title}</h1>
        <p className="text-(--color-fg-muted) leading-relaxed max-w-md mx-auto">{s.teaser}</p>
      </div>

      {/* Coming soon card */}
      <div className="rounded-2xl bg-(--color-deep) text-white p-6 md:p-7 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -right-10 -top-10 w-44 h-44 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, var(--color-gold), transparent)' }}
        />
        <div className="relative">
          <div className="text-xs uppercase tracking-widest text-(--color-gold) mb-2">
            ✦ AI Раввин · Запуск скоро
          </div>
          <h2 className="font-serif text-2xl font-semibold mb-3">
            Этот разговор оживёт через пару дней
          </h2>
          <p className="text-sm leading-relaxed opacity-90 mb-5">
            Готовим AI на базе GPT-4o-mini, который знает твою общину, твой профиль,
            недельную парашу и помнит вашу историю разговоров. Каждый из 6 сценариев — со
            своей экспертизой.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <Feature>Streaming-ответы как у ChatGPT</Feature>
            <Feature>Помнит контекст недели</Feature>
            <Feature>Знает твою общину и rabbi</Feature>
            <Feature>Безопасный режим в трудные моменты</Feature>
          </div>
        </div>
      </div>

      {/* Tease — what user could ask */}
      <div className="mt-6 px-1">
        <div className="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-3">
          Примеры того что можно спросить
        </div>
        <div className="space-y-2">
          {getExamplePrompts(scenario).map((q, i) => (
            <div
              key={i}
              className="rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 px-4 py-3 text-sm text-(--color-fg-muted) opacity-60"
            >
              «{q}»
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 opacity-90">
      <span className="text-(--color-gold) shrink-0">✓</span>
      <span>{children}</span>
    </div>
  );
}

function getExamplePrompts(scenario: string): string[] {
  switch (scenario) {
    case 'purpose':
      return [
        'Я чувствую что застрял в жизни. С чего начать?',
        'Как соблюдение помогает найти смысл в работе?',
        'Расскажи про идею тиккун олам',
      ];
    case 'shabbat':
      return [
        'Я в Бангкоке на следующей неделе, где шаббат?',
        'Хочу позвать друзей на ужин — что приготовить?',
        'Спланируй мне идеальный шаббат на даче',
      ];
    case 'hebrew-school':
      return [
        'Ищу Hebrew school для дочки 7 лет в Tel Aviv',
        'Какие летние программы есть для подростков?',
        'Помоги записать ребёнка в Chabad school',
      ];
    case 'parsha':
      return [
        'Что главное в парше этой недели?',
        'Как связана парша с моей жизнью прямо сейчас?',
        'Объясни как ребёнку, что такое мишкан',
      ];
    case 'meet-people':
      return [
        'Кто в моей общине увлекается Талмудом?',
        'Найди мне семьи с детьми 5-7 лет',
        'Хочу хевруту по 30 минут утром — кто свободен?',
      ];
    case 'struggling':
      return [
        'Я устал и потерял веру. Слушаешь?',
        'Развод. Не знаю что дальше.',
        'У меня тревога, не могу спать',
      ];
    default:
      return [];
  }
}
