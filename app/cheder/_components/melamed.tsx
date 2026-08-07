'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useCheder } from './state';

// The guide character. Drop the real artwork at public/cheder/melamed.png —
// until the file exists, the inline SVG below stands in.

const NAME = 'Reb Nachum';

const TIPS: Array<[string, string[]]> = [
  ['/cheder/lesson/tefilla', [
    'Every word of davening is a diamond — tap it and see what shines inside.',
    'Now out loud! Your neshama likes to hear it.',
  ]],
  ['/cheder/lesson/chumash', [
    'Open every word — the Torah loves good questions.',
    'Rashi asked this 900 years ago. Now it’s your turn to answer.',
  ]],
  ['/cheder/lesson/mishna', [
    'Two boys, one tallis — who gets it? Open the whole map!',
    'Want to SEE it happen? Tap “Bring it to life”.',
  ]],
  ['/cheder/lesson/math', ['Five right in a row and the level jumps. On your marks…']],
  ['/cheder/live', ['Say it out loud to Levi — Torah sticks when a friend hears it.']],
  ['/cheder/play', ['Kop time! Pick a game — I’ll be right here when you’re back.']],
  ['/cheder/store', ['Save for the raffle or spend now? A real question of chochma!']],
  ['/cheder/progress', ['Look how far you’ve come — one level at a time.']],
  ['/cheder/create', ['Pick a scene and watch what you learned come alive!']],
  ['/cheder/today', [
    'Sholom aleichem, {name}! See the blue badge? That’s where we start.',
    'Three green checks before lunch — I know you can.',
  ]],
  ['/cheder', ['Sholom aleichem! I’m {rebbe}, your melamed. Write your name and let’s build your cheder!']],
];

function tipsFor(pathname: string): string[] {
  for (const [prefix, tips] of TIPS) {
    if (pathname === prefix || (prefix !== '/cheder' && pathname.startsWith(prefix))) return tips;
  }
  return TIPS[TIPS.length - 1][1];
}

export function MelamedGuide() {
  const pathname = usePathname();
  const { child } = useCheder();
  const [open, setOpen] = React.useState(true);
  const [tipIdx, setTipIdx] = React.useState(0);
  const [imgOk, setImgOk] = React.useState(true);

  React.useEffect(() => {
    setTipIdx(0);
    setOpen(true);
  }, [pathname]);

  const tips = tipsFor(pathname ?? '/cheder');
  const tip = tips[tipIdx % tips.length]
    .replace('{name}', child?.name ?? 'chaver')
    .replace('{rebbe}', NAME);

  return (
    <div className="pointer-events-none fixed right-3 bottom-3 z-50 flex flex-col items-end gap-2 sm:right-5 sm:bottom-5">
      {open && (
        <div
          key={`${pathname}-${tipIdx}`}
          className="pointer-events-auto relative max-w-60 rounded-2xl rounded-br-sm border border-border bg-card p-3 pr-7 shadow-lg shadow-black/5"
          style={{ animation: 'cheder-pop 0.35s ease-out both' }}
        >
          <p className="text-[0.8rem] leading-snug font-medium">{tip}</p>
          <p className="mt-1 text-[0.65rem] font-bold tracking-wide uppercase" style={{ color: 'var(--ch-blue)' }}>
            {NAME}
          </p>
          <button
            type="button"
            aria-label="Hide tip"
            onClick={() => setOpen(false)}
            className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <button
        type="button"
        aria-label={`${NAME}, your guide`}
        onClick={() => {
          if (!open) setOpen(true);
          else setTipIdx((i) => i + 1);
        }}
        className="pointer-events-auto"
        style={{ animation: 'cheder-float 3.2s ease-in-out infinite' }}
      >
        {imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/cheder/melamed.png"
            alt={NAME}
            width={92}
            height={120}
            className="h-[120px] w-auto drop-shadow-md select-none"
            onError={() => setImgOk(false)}
            draggable={false}
          />
        ) : (
          <MelamedSvg className="h-[120px] w-auto drop-shadow-md" />
        )}
      </button>
    </div>
  );
}

/** Flat stand-in portrait: black hat, glasses, beard, long coat, tablet. */
function MelamedSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 270" className={className} aria-hidden>
      {/* shadow */}
      <ellipse cx="100" cy="258" rx="52" ry="9" fill="#0f172a" opacity="0.12" />
      {/* legs & shoes */}
      <rect x="82" y="216" width="14" height="34" rx="6" fill="#1a202c" />
      <rect x="104" y="216" width="14" height="34" rx="6" fill="#1a202c" />
      <path d="M74 248 h24 a6 6 0 0 1 6 6 v2 h-34 a8 8 0 0 1 4-8z" fill="#0f141c" />
      <path d="M126 248 h-24 a6 6 0 0 0-6 6 v2 h34 a8 8 0 0 0-4-8z" fill="#0f141c" />
      {/* coat */}
      <path d="M62 132 q-6 60 0 88 q38 12 76 0 q6-28 0-88 q-18-14 -38-14 t-38 14z" fill="#232a38" />
      <path d="M100 118 l-16 14 8 8 -6 60 6 26 8 6 8-6 6-26 -6-60 8-8z" fill="#f8fafc" />
      <path d="M100 132 l-6 8 4 44 2 10 2-10 4-44z" fill="#1a202c" />
      {/* coat overlap + buttons */}
      <path d="M100 132 q-22 4 -30 84 l14 4 q4-50 16-88z" fill="#1d2432" />
      <path d="M100 132 q22 4 30 84 l-14 4 q-4-50 -16-88z" fill="#1d2432" />
      <circle cx="86" cy="168" r="2.6" fill="#8b93a3" />
      <circle cx="86" cy="188" r="2.6" fill="#8b93a3" />
      <circle cx="114" cy="168" r="2.6" fill="#8b93a3" />
      <circle cx="114" cy="188" r="2.6" fill="#8b93a3" />
      {/* right arm holding tablet */}
      <path d="M132 140 q16 10 12 44 l-16 10 q-6-24 -6-44z" fill="#232a38" />
      <rect x="112" y="168" width="34" height="46" rx="5" fill="#9aa4b2" transform="rotate(8 129 191)" />
      <rect x="116" y="172" width="26" height="38" rx="3" fill="#c8d0da" transform="rotate(8 129 191)" />
      {/* left arm folded */}
      <path d="M68 140 q-14 12 -8 40 q10 8 22 4 l6-16 q-10-14 -20-28z" fill="#232a38" />
      <path d="M84 176 q10 6 22 4 l-2 10 q-12 4 -24-2z" fill="#e9b98d" />
      {/* head */}
      <ellipse cx="100" cy="92" rx="34" ry="30" fill="#eec39a" />
      {/* beard */}
      <path d="M66 92 q-2 42 34 46 q36-4 34-46 q-8 26 -34 26 q-26 0 -34-26z" fill="#2b2620" />
      <path d="M88 112 q12 8 24 0 l-4 10 q-8 4 -16 0z" fill="#3a332b" />
      {/* mouth */}
      <path d="M92 108 q8 6 16 0" stroke="#7c3d1e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* nose */}
      <path d="M100 92 q-4 8 2 12" stroke="#d9a271" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* glasses */}
      <circle cx="86" cy="88" r="10" fill="none" stroke="#20242c" strokeWidth="3" />
      <circle cx="114" cy="88" r="10" fill="none" stroke="#20242c" strokeWidth="3" />
      <path d="M96 88 h8" stroke="#20242c" strokeWidth="3" />
      <circle cx="86" cy="88" r="3" fill="#20242c" />
      <circle cx="114" cy="88" r="3" fill="#20242c" />
      {/* brows */}
      <path d="M78 76 q8-4 14 0" stroke="#2b2620" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M108 76 q6-4 14 0" stroke="#2b2620" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* hat */}
      <ellipse cx="100" cy="62" rx="46" ry="12" fill="#14181f" />
      <path d="M68 60 q0-30 32-30 t32 30 q-14 8 -32 8 t-32-8z" fill="#171c25" />
      <path d="M68 56 q32 10 64 0 v6 q-32 10 -64 0z" fill="#0d1117" />
    </svg>
  );
}
