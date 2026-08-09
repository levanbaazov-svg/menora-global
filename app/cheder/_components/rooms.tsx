'use client';

import {
  BookMarked, BookOpen, Calculator, Gamepad2, Gift, LampDesk, Scale, Star, Sunrise,
  Sparkles, type LucideIcon,
} from 'lucide-react';

export type Room = {
  id: string;
  name: string;
  he: string;
  main: string;
  soft: string;
  icon: LucideIcon;
  status: string;
  cta?: { href: string; label: string };
  liveNote?: string;
  shelf: string[];
  board: Array<{ from: string; text: string }>;
  rebbeLine: string;
  vignette: 'aron' | 'sefer' | 'scales' | 'candle' | 'math' | 'books' | 'ball' | 'gift' | 'desk' | 'easel';
};

export const ROOMS: Room[] = [
  {
    id: 'tefilla', name: 'Beis Midrash', he: 'בית מדרש', main: 'var(--ch-sky)', soft: 'var(--ch-sky-soft)',
    icon: Sunrise, vignette: 'aron',
    status: 'Tefilla with the whole class · 8:00',
    cta: { href: '/cheder/lesson/tefilla', label: 'Open the siddur' },
    shelf: ['Why we say Modeh Ani first', 'The 12 Pesukim — audio', 'My brachos chart'],
    board: [
      { from: 'Rabbi K.', text: 'Boker tov! Today we add the first bracha after Modeh Ani.' },
      { from: 'Levi', text: 'I read the whole first line without stopping!' },
    ],
    rebbeLine: 'This is our Beis Midrash. Every morning the whole class davens here together — you will hear everyone.',
  },
  {
    id: 'chumash', name: 'Chumash Room', he: 'חומש', main: 'var(--ch-blue)', soft: 'var(--ch-blue-soft)',
    icon: BookOpen, vignette: 'sefer',
    status: 'Today: Bereishis 1:1 + Rashi’s question',
    cta: { href: '/cheder/lesson/chumash', label: 'Start today’s pasuk' },
    shelf: ['Who was Rashi? — story', 'Map: the world of Bereishis', 'Alef-Beis of trop — audio'],
    board: [
      { from: 'Rabbi K.', text: 'Question of the day: why does the Torah start with creation?' },
      { from: 'Mendy', text: 'Because the world belongs to Hashem!' },
      { from: 'Sholom', text: 'Rashi says that! Koach maasav...' },
    ],
    rebbeLine: 'The Chumash room. On this board hangs the question of the day — and today it is Rashi’s own question.',
  },
  {
    id: 'mishna', name: 'Mishna & Gemara', he: 'משנה', main: 'var(--ch-violet)', soft: 'var(--ch-violet-soft)',
    icon: Scale, vignette: 'scales',
    status: 'Today: Shnayim Ochazin + the sugya map',
    cta: { href: '/cheder/lesson/mishna', label: 'Open the sugya map' },
    shelf: ['Who is who: Tannaim timeline', 'What is a machlokes?', 'Bava Metzia — the big picture'],
    board: [
      { from: 'Rabbi K.', text: 'Big din Torah today: two boys, one tallis. Come with your svara!' },
      { from: 'Levi', text: 'I think they should race for it 😄' },
      { from: 'Rabbi K.', text: 'Levi — and what would the Mishna say to that?' },
    ],
    rebbeLine: 'Mishna and Gemara live here. Every sugya has its own map on the wall — who holds what, and why.',
  },
  {
    id: 'chassidus', name: 'Chassidus Corner', he: 'חסידות', main: 'var(--ch-amber)', soft: 'var(--ch-amber-soft)',
    icon: Star, vignette: 'candle',
    status: 'Story time · 1:45 — the Alter Rebbe',
    liveNote: 'Live with Rabbi Khanukaev',
    shelf: ['The sefiros chart — puzzle', 'Niggun of the week — audio', 'Story: the Alter Rebbe and the baby'],
    board: [
      { from: 'Rabbi K.', text: 'After the story we build the sefiros chart together.' },
      { from: 'Zalmy', text: 'I know the niggun already!' },
    ],
    rebbeLine: 'The warm corner — Chassidus. Stories, niggunim, and charts you build with your own hands.',
  },
  {
    id: 'math', name: 'Math Lab', he: 'חשבון', main: 'var(--ch-teal)', soft: 'var(--ch-teal-soft)',
    icon: Calculator, vignette: 'math',
    status: 'Your level: 5 · sprint + problem sets',
    cta: { href: '/cheder/lesson/math', label: 'Run the fluency sprint' },
    shelf: ['Beast problems — set 12', 'Multiplication race table', 'Puzzle of the week'],
    board: [
      { from: 'Ms. Gold', text: 'Sprint records this week: 24 correct! Who beats it?' },
      { from: 'Mendy', text: 'Me. Today. 🚀' },
    ],
    rebbeLine: 'The math lab. Serious math — at your own pace, with real games. Two hours a day, done properly.',
  },
  {
    id: 'english', name: 'Library & English', he: 'ספריה', main: 'var(--ch-green)', soft: 'var(--ch-green-soft)',
    icon: BookMarked, vignette: 'books',
    status: 'Reading at your level · 1:00',
    liveNote: 'Adaptive reading program',
    shelf: ['My bookshelf — level 3', 'Write it: my story draft', 'Word of the day'],
    board: [
      { from: 'Ms. Gold', text: 'New books unlocked on level 3 — check your shelf!' },
      { from: 'Sholom', text: 'The detective one is mine!' },
    ],
    rebbeLine: 'The library. Books at exactly your level — and your own stories that you will write here.',
  },
  {
    id: 'create', name: 'Art Studio', he: 'סטודיו', main: 'var(--ch-amber)', soft: 'var(--ch-amber-soft)',
    icon: Sparkles, vignette: 'easel',
    status: 'Bring today’s learning to life',
    cta: { href: '/cheder/create', label: 'Open the studio' },
    shelf: ['My gallery', 'Scene templates — approved by the Rav', 'How a scene is made'],
    board: [
      { from: 'Rabbi K.', text: 'Best scene of the week goes on the school wall!' },
    ],
    rebbeLine: 'The studio! Here what you learned becomes pictures and living scenes. Every template the Rav approved himself.',
  },
  {
    id: 'yard', name: 'The Yard', he: 'חצר', main: 'var(--ch-green)', soft: 'var(--ch-green-soft)',
    icon: Gamepad2, vignette: 'ball',
    status: 'Recess games · 9:15 and 2:00',
    cta: { href: '/cheder/play', label: 'Go to recess' },
    shelf: [],
    board: [],
    rebbeLine: 'The yard! At recess the games open here — chess, puzzles, sprints. Only what the school approved.',
  },
  {
    id: 'store', name: 'Cheder Store', he: 'חנות', main: 'var(--ch-amber)', soft: 'var(--ch-amber-soft)',
    icon: Gift, vignette: 'gift',
    status: 'Raffle this Sunday · Hollywood, FL',
    cta: { href: '/cheder/store', label: 'Spend my tickets' },
    shelf: [],
    board: [],
    rebbeLine: 'The store. Tickets you earn by learning turn into prizes — or into tzedakah the school doubles.',
  },
  {
    id: 'desk', name: 'My Desk', he: 'השולחן שלי', main: 'var(--ch-slate)', soft: 'var(--ch-slate-soft)',
    icon: LampDesk, vignette: 'desk',
    status: 'Levels, streaks & my week',
    cta: { href: '/cheder/progress', label: 'Open my desk' },
    shelf: [],
    board: [],
    rebbeLine: 'Your desk. Here you see how far you have come — level by level. Your parents see it too.',
  },
];

export function roomById(id: string): Room | undefined {
  return ROOMS.find((r) => r.id === id);
}

/** Tiny illustrated vignette drawn over each door's colored header. */
export function RoomVignette({ kind, main }: { kind: Room['vignette']; main: string }) {
  const stroke = { stroke: main, strokeWidth: 5, fill: 'none', strokeLinecap: 'round' as const };
  return (
    <svg viewBox="0 0 120 72" className="h-16 w-full" aria-hidden>
      {kind === 'aron' && (
        <g>
          <path d="M33 64 v-32 a27 27 0 0 1 54 0 v32" {...stroke} />
          <path d="M44 62 v-19 a7.5 7.5 0 0 1 15 0 v19 z" fill={main} opacity={0.85} />
          <path d="M61 62 v-19 a7.5 7.5 0 0 1 15 0 v19 z" fill={main} opacity={0.6} />
        </g>
      )}
      {kind === 'sefer' && (
        <g>
          <path d="M18 56 q21 -10 42 0 q21 -10 42 0 v-36 q-21 -10 -42 0 q-21 -10 -42 0z" {...stroke} />
          <path d="M60 20 v36" {...stroke} strokeWidth={4} opacity={0.7} />
          <path d="M28 32 h20 M28 42 h20 M72 32 h20 M72 42 h20" stroke={main} strokeWidth={3} strokeLinecap="round" opacity={0.5} />
        </g>
      )}
      {kind === 'scales' && (
        <g>
          <path d="M60 14 v44 M40 58 h40 M30 22 h60" {...stroke} />
          <path d="M30 22 l-10 18 h20z M90 22 l-10 18 h20z" {...stroke} strokeWidth={4} />
        </g>
      )}
      {kind === 'candle' && (
        <g>
          <path d="M52 64 h16 M56 64 v-26 h8 v26" {...stroke} />
          <path d="M60 30 q-8 -10 0 -18 q8 8 0 18z" fill={main} opacity={0.8} />
        </g>
      )}
      {kind === 'math' && (
        <g>
          <text x="24" y="46" fontSize="34" fontWeight="800" fill={main}>π</text>
          <text x="52" y="52" fontSize="26" fontWeight="800" fill={main} opacity={0.7}>×</text>
          <text x="76" y="42" fontSize="30" fontWeight="800" fill={main} opacity={0.85}>7</text>
        </g>
      )}
      {kind === 'books' && (
        <g>
          <rect x="26" y="24" width="12" height="40" rx="2" fill={main} opacity={0.85} />
          <rect x="42" y="16" width="12" height="48" rx="2" fill={main} opacity={0.6} />
          <rect x="58" y="28" width="12" height="36" rx="2" fill={main} opacity={0.9} />
          <rect x="74" y="20" width="12" height="44" rx="2" fill={main} opacity={0.5} transform="rotate(8 80 42)" />
        </g>
      )}
      {kind === 'ball' && (
        <g>
          <circle cx="60" cy="40" r="22" {...stroke} />
          <polygon points="60,32 52.4,37.5 55.3,46.5 64.7,46.5 67.6,37.5" fill={main} opacity={0.8} />
          <path d="M60 32 L60 20 M52.4 37.5 L41 33.8 M55.3 46.5 L48.2 56.2 M64.7 46.5 L71.8 56.2 M67.6 37.5 L79 33.8" stroke={main} strokeWidth={3} fill="none" opacity={0.6} />
        </g>
      )}
      {kind === 'gift' && (
        <g>
          <rect x="34" y="30" width="52" height="32" rx="4" {...stroke} />
          <path d="M60 30 v32 M30 30 h60 M60 30 q-14 -18 -20 -6 q-4 8 20 6 q24 2 20 -6 q-6 -12 -20 6" {...stroke} strokeWidth={4} />
        </g>
      )}
      {kind === 'desk' && (
        <g>
          <path d="M24 60 h72 M30 60 v-16 h60 v16" {...stroke} />
          <path d="M70 44 v-10 q0 -8 -10 -6 M60 28 a8 8 0 1 1 0.1 0" {...stroke} strokeWidth={4} />
        </g>
      )}
      {kind === 'easel' && (
        <g>
          <path d="M40 20 h40 v34 h-40z" {...stroke} />
          <path d="M36 62 L52 54 M84 62 L68 54 M60 54 v10" {...stroke} strokeWidth={4} />
          <path d="M48 40 q8 -12 14 0 q6 -8 10 0" stroke={main} strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.7} />
        </g>
      )}
    </svg>
  );
}
