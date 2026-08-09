'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Mic, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listenOnce, recognitionAvailable, speak, stopSpeaking, voiceAvailable } from './voice';
import { useCheder } from './state';

export const REBBE_NAME = 'Reb Nachum';

// ── Context: any screen can make the Rebbe talk ──────────────────────────────

type RebbeCtx = {
  say: (text: string, opts?: { wave?: boolean; bubble?: boolean }) => void;
  stop: () => void;
  speaking: boolean;
  voiceOn: boolean;
};

const Ctx = React.createContext<RebbeCtx | null>(null);

export function useRebbe(): RebbeCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useRebbe must be used inside <RebbeProvider>');
  return ctx;
}

const TIPS: Array<[string, string]> = [
  ['/cheder/lesson/tefilla', 'Every word of davening is a diamond — tap it and see what shines inside.'],
  ['/cheder/lesson/chumash', 'Open every word — the Torah loves good questions.'],
  ['/cheder/lesson/mishna', 'Two boys, one tallis — who gets it? And tap “Bring it to life” to watch it happen!'],
  ['/cheder/lesson/math', 'Five right in a row and the level jumps. On your marks…'],
  ['/cheder/live', 'Say it out loud to your chavrusa — Torah sticks when a friend hears it.'],
  ['/cheder/play', 'Kop time! Pick a game — I will be right here when you come back.'],
  ['/cheder/store', 'Save for the raffle or spend now? A real question of chochma!'],
  ['/cheder/progress', 'Look how far you have come — one level at a time.'],
  ['/cheder/create', 'Pick a scene and watch what you learned come alive!'],
  ['/cheder/room', 'This is your classroom. The board shows today’s work — and the shelf has treasures.'],
  ['/cheder/school', 'Welcome to your school! Every door is a real classroom. Where shall we go first?'],
  ['/cheder/today', 'This is your day. See the blue badge? That is where we start.'],
  ['/cheder', 'Sholom aleichem! I am {rebbe}, your melamed. Tell me your name and let us build your cheder!'],
];

function tipFor(pathname: string): string {
  for (const [prefix, tip] of TIPS) {
    if (pathname === prefix || (prefix !== '/cheder' && pathname.startsWith(prefix))) return tip;
  }
  return TIPS[TIPS.length - 1][1];
}

const COMMANDS: Array<[string[], string, string]> = [
  [['school', 'campus'], '/cheder/school', 'Here is your school!'],
  [['day', 'schedule', 'today'], '/cheder/today', 'Here is your day.'],
  [['chumash', 'humash'], '/cheder/room/chumash', 'To the Chumash room!'],
  [['mishna', 'mishnah', 'gemara', 'talmud'], '/cheder/room/mishna', 'To the Mishna room!'],
  [['chassidus', 'hasidus', 'chasidus'], '/cheder/room/chassidus', 'To the Chassidus room!'],
  [['math', 'mathematics'], '/cheder/room/math', 'To the math lab!'],
  [['english', 'reading', 'library'], '/cheder/room/english', 'To the library!'],
  [['daven', 'davening', 'tefilla', 'pray'], '/cheder/room/tefilla', 'Time to daven!'],
  [['recess', 'play', 'game'], '/cheder/play', 'Kop time!'],
  [['store', 'ticket', 'shop', 'raffle'], '/cheder/store', 'To the cheder store!'],
  [['progress', 'desk', 'level'], '/cheder/progress', 'Here is your desk.'],
  [['create', 'life', 'picture', 'scene'], '/cheder/create', 'Let us make it real!'],
];

export function RebbeProvider({ children }: { children: React.ReactNode }) {
  const [speaking, setSpeaking] = React.useState(false);
  const [voiceOn, setVoiceOn] = React.useState(true);
  const [bubble, setBubble] = React.useState<string | null>(null);
  const [waving, setWaving] = React.useState(false);

  React.useEffect(() => {
    try {
      setVoiceOn(window.localStorage.getItem('cheder-voice') !== 'off');
    } catch { /* keep default */ }
  }, []);

  const say = React.useCallback((text: string, opts?: { wave?: boolean; bubble?: boolean }) => {
    setBubble(opts?.bubble === false ? null : text);
    if (opts?.wave) {
      setWaving(true);
      window.setTimeout(() => setWaving(false), 1600);
    }
    if (voiceOn && voiceAvailable()) {
      speak(text, {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
      });
    }
  }, [voiceOn]);

  const stop = React.useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
  }, []);

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    if (!next) stop();
    try {
      window.localStorage.setItem('cheder-voice', next ? 'on' : 'off');
    } catch { /* fine */ }
  };

  const value = React.useMemo(() => ({ say, stop, speaking, voiceOn }), [say, stop, speaking, voiceOn]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <RebbeWidget
        speaking={speaking}
        waving={waving}
        bubble={bubble}
        onDismissBubble={() => setBubble(null)}
        onToggleVoice={toggleVoice}
        voiceOn={voiceOn}
        say={say}
      />
    </Ctx.Provider>
  );
}

// ── The on-screen Rebbe ──────────────────────────────────────────────────────

function RebbeWidget({
  speaking, waving, bubble, onDismissBubble, onToggleVoice, voiceOn, say,
}: {
  speaking: boolean;
  waving: boolean;
  bubble: string | null;
  onDismissBubble: () => void;
  onToggleVoice: () => void;
  voiceOn: boolean;
  say: (text: string) => void;
}) {
  const pathname = usePathname() ?? '/cheder';
  const router = useRouter();
  const { child } = useCheder();
  const [listening, setListening] = React.useState(false);
  const [tipBubble, setTipBubble] = React.useState<string | null>(null);
  const onLanding = pathname === '/cheder';

  // Fresh silent tip on every screen; spoken lines (bubble) take priority.
  React.useEffect(() => {
    setTipBubble(tipFor(pathname).replace('{rebbe}', REBBE_NAME));
  }, [pathname]);

  const shown = bubble ?? tipBubble;

  if (onLanding) return null;

  const onMic = () => {
    if (!recognitionAvailable()) {
      say('Voice commands need Chrome or Safari. Tap the rooms instead!');
      return;
    }
    setListening(true);
    listenOnce(
      (transcript) => {
        const hit = COMMANDS.find(([words]) => words.some((w) => transcript.includes(w)));
        if (hit) {
          say(hit[2]);
          router.push(hit[1]);
        } else {
          say('Hmm, I did not catch that. Try “Chumash”, “math”, or “my day”.');
        }
      },
      () => setListening(false),
    );
  };

  return (
    <div className="pointer-events-none fixed right-2 bottom-2 z-50 flex flex-col items-end gap-1.5 sm:right-5 sm:bottom-4">
      {shown && (
        <div
          key={shown}
          className="pointer-events-auto relative max-w-64 rounded-2xl rounded-br-sm border border-border bg-card p-3 pr-7 shadow-lg shadow-black/5"
          style={{ animation: 'cheder-pop 0.35s ease-out both' }}
        >
          <p className="text-[0.82rem] leading-snug font-medium">
            {(child ? shown : shown).replace('{name}', child?.name ?? 'chaver')}
          </p>
          <p className="mt-1 text-[0.65rem] font-bold tracking-wide uppercase" style={{ color: 'var(--ch-blue)' }}>
            {REBBE_NAME}
          </p>
          <button
            type="button"
            aria-label="Hide"
            onClick={() => { onDismissBubble(); setTipBubble(null); }}
            className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="pointer-events-auto flex items-end gap-1.5">
        <div className="mb-2 flex flex-col gap-1.5">
          <button
            type="button"
            aria-label={voiceOn ? 'Voice off' : 'Voice on'}
            onClick={onToggleVoice}
            className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground"
          >
            {voiceOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>
          <button
            type="button"
            aria-label="Talk to the Rebbi"
            onClick={onMic}
            className={cn(
              'flex size-8 items-center justify-center rounded-full border shadow-sm transition-colors',
              listening
                ? 'border-transparent text-white'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
            style={listening ? { backgroundColor: 'var(--ch-rose)', animation: 'cheder-float 0.8s ease-in-out infinite' } : undefined}
          >
            <Mic className="size-4" />
          </button>
        </div>
        <button
          type="button"
          aria-label={`${REBBE_NAME}, your melamed`}
          onClick={() => say(tipFor(pathname).replace('{rebbe}', REBBE_NAME).replace('{name}', child?.name ?? 'chaver'))}
          className={cn('rb-bob block', speaking && 'rb-talking', waving && 'rb-waving')}
        >
          <RebbeArt className="h-[148px] w-auto drop-shadow-lg sm:h-[168px]" />
        </button>
      </div>
    </div>
  );
}

// ── The artwork ──────────────────────────────────────────────────────────────
// Vector rendition of the school's melamed mascot: black fedora, round
// glasses, warm smile in a full beard, long black frock coat, tablet in hand.

export function RebbeArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 330" className={className} aria-hidden>
      <defs>
        <radialGradient id="rb-skin" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#f6cda6" />
          <stop offset="78%" stopColor="#eec09a" />
          <stop offset="100%" stopColor="#dfa87e" />
        </radialGradient>
        <linearGradient id="rb-coat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b3242" />
          <stop offset="100%" stopColor="#181d29" />
        </linearGradient>
        <linearGradient id="rb-hat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a303d" />
          <stop offset="100%" stopColor="#12151d" />
        </linearGradient>
        <linearGradient id="rb-beard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#41352a" />
          <stop offset="100%" stopColor="#2a2118" />
        </linearGradient>
        <linearGradient id="rb-tablet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c3cbd6" />
          <stop offset="100%" stopColor="#98a2af" />
        </linearGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="120" cy="316" rx="62" ry="10" fill="#0f172a" opacity="0.12" />

      {/* legs & shoes */}
      <rect x="98" y="268" width="17" height="40" rx="8" fill="#151a24" />
      <rect x="125" y="268" width="17" height="40" rx="8" fill="#151a24" />
      <path d="M86 302 h30 a8 8 0 0 1 8 8 v3 h-42 a10 10 0 0 1 4 -11z" fill="#0b0e14" />
      <path d="M154 302 h-30 a8 8 0 0 0 -8 8 v3 h42 a10 10 0 0 0 -4 -11z" fill="#0b0e14" />

      {/* right arm (viewer left) — waves */}
      <g className="rb-arm" style={{ transformBox: 'fill-box', transformOrigin: '80% 15%' }}>
        <path d="M74 176 q-22 16 -16 52 q4 16 18 20 l10 -14 q-8 -22 -4 -52z" fill="url(#rb-coat)" />
        <ellipse cx="79" cy="246" rx="11" ry="12" fill="#eec09a" />
      </g>

      {/* coat */}
      <path d="M76 172 q-10 66 -2 100 q46 16 92 0 q8 -34 -2 -100 q-20 -20 -44 -20 t-44 20z" fill="url(#rb-coat)" />
      {/* shirt + tie */}
      <path d="M120 152 l-20 18 10 12 -6 66 8 26 8 6 8 -6 8 -26 -6 -66 10 -12z" fill="#f8fafc" />
      <path d="M120 170 l-8 10 5 48 3 12 3 -12 5 -48z" fill="#12151d" />
      <circle cx="120" cy="170" r="3" fill="#12151d" />
      {/* lapels */}
      <path d="M120 152 l-24 20 12 10 12 -18z" fill="#232938" />
      <path d="M120 152 l24 20 -12 10 -12 -18z" fill="#232938" />
      {/* double-breast + buttons */}
      <path d="M120 164 q-26 8 -34 104 l16 4 q6 -60 18 -108z" fill="#1f2532" />
      <path d="M120 164 q26 8 34 104 l-16 4 q-6 -60 -18 -108z" fill="#1f2532" />
      {[196, 222, 248].map((y) => (
        <React.Fragment key={y}>
          <circle cx="103" cy={y} r="3" fill="#8f97a6" />
          <circle cx="137" cy={y} r="3" fill="#8f97a6" />
        </React.Fragment>
      ))}

      {/* left arm holding tablet */}
      <path d="M166 176 q20 14 14 50 l-20 12 q-6 -28 -6 -50z" fill="url(#rb-coat)" />
      <g transform="rotate(9 148 226)">
        <rect x="122" y="198" width="44" height="58" rx="6" fill="url(#rb-tablet)" />
        <rect x="127" y="203" width="34" height="48" rx="3" fill="#e6ebf1" />
        <rect x="131" y="210" width="26" height="4" rx="2" fill="#b9c2cd" />
        <rect x="131" y="219" width="20" height="4" rx="2" fill="#c9d1da" />
        <rect x="131" y="228" width="24" height="4" rx="2" fill="#c9d1da" />
      </g>
      <ellipse cx="126" cy="252" rx="11" ry="9" fill="#eec09a" />

      {/* head */}
      <ellipse cx="120" cy="104" rx="50" ry="46" fill="url(#rb-skin)" />
      {/* ears */}
      <ellipse cx="70" cy="108" rx="8" ry="11" fill="#e8b48c" />
      <ellipse cx="170" cy="108" rx="8" ry="11" fill="#e8b48c" />
      {/* cheeks */}
      <ellipse cx="88" cy="122" rx="9" ry="6" fill="#e79a76" opacity="0.45" />
      <ellipse cx="152" cy="122" rx="9" ry="6" fill="#e79a76" opacity="0.45" />

      {/* beard */}
      <path d="M70 108 q-4 58 50 64 q54 -6 50 -64 q-10 34 -50 34 q-40 0 -50 -34z" fill="url(#rb-beard)" />
      <path d="M96 146 q24 14 48 0 q-4 16 -24 18 q-20 -2 -24 -18z" fill="#241c14" />
      {/* beard strands */}
      <path d="M92 150 q2 8 6 12 M120 156 q0 8 0 12 M148 150 q-2 8 -6 12" stroke="#55452f" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* mustache */}
      <path d="M100 138 q10 -7 20 0 q10 -7 20 0 q-8 9 -20 6 q-12 3 -20 -6z" fill="#33291d" />

      {/* mouth: closed smile / talking */}
      <g className="rb-mouth">
        <path className="rb-mouth-closed" d="M108 144 q12 10 24 0" stroke="#8a4a26" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <g className="rb-mouth-open" style={{ transformBox: 'fill-box', transformOrigin: '50% 30%' }}>
          <ellipse cx="120" cy="148" rx="9" ry="7" fill="#6e3018" />
          <ellipse cx="120" cy="151" rx="5" ry="3" fill="#c96b4a" />
        </g>
      </g>

      {/* nose */}
      <path d="M120 112 q-7 12 0 18 q6 -2 6 -8" fill="#e2a87e" />
      <path d="M114 128 q6 4 12 0" stroke="#d59a71" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* eyes (blink) */}
      <g className="rb-eye" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <ellipse cx="98" cy="104" rx="7.5" ry="8.5" fill="#ffffff" />
        <circle cx="99" cy="106" r="4.4" fill="#2d2119" />
        <circle cx="100.5" cy="104" r="1.6" fill="#ffffff" />
      </g>
      <g className="rb-eye" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <ellipse cx="142" cy="104" rx="7.5" ry="8.5" fill="#ffffff" />
        <circle cx="143" cy="106" r="4.4" fill="#2d2119" />
        <circle cx="144.5" cy="104" r="1.6" fill="#ffffff" />
      </g>

      {/* brows */}
      <path d="M88 90 q10 -6 20 -1" stroke="#3a2f22" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M132 89 q10 -5 20 1" stroke="#3a2f22" strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* glasses */}
      <circle cx="98" cy="104" r="16" fill="none" stroke="#1d222c" strokeWidth="3.5" />
      <circle cx="142" cy="104" r="16" fill="none" stroke="#1d222c" strokeWidth="3.5" />
      <path d="M114 102 q6 -4 12 0" stroke="#1d222c" strokeWidth="3.5" fill="none" />
      <path d="M82 102 L70 100 M158 102 L170 100" stroke="#1d222c" strokeWidth="3" strokeLinecap="round" />

      {/* hat */}
      <path d="M120 76 q-58 0 -70 -6 q-4 -2 2 -6 q26 -10 68 -10 t68 10 q6 4 2 6 q-12 6 -70 6z" fill="url(#rb-hat)" />
      <path d="M78 60 q0 -38 42 -38 t42 38 q-14 8 -42 8 t-42 -8z" fill="url(#rb-hat)" />
      <path d="M78 54 q42 12 84 0 v9 q-42 12 -84 0z" fill="#0a0d13" />
      <path d="M92 32 q12 -8 34 -6" stroke="#3a4152" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
