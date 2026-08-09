'use client';

// Voice layer. Today: the browser's built-in speech synthesis — works offline
// on any iPad/laptop with zero keys. In production this module swaps to a
// realtime voice model (same interface), so the whole platform talks through
// one place.

let voicesCache: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
  return voicesCache;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
}

export function voiceAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = loadVoices();
  if (!voices.length) return null;
  const exact = voices.filter((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
  const preferred = ['Samantha', 'Daniel', 'Google US English', 'Aaron', 'Alex'];
  for (const name of preferred) {
    const hit = exact.find((v) => v.name.includes(name));
    if (hit) return hit;
  }
  return exact[0] ?? voices.find((v) => v.default) ?? voices[0];
}

export type SpeakHandle = { cancelled: boolean };

export function speak(
  text: string,
  opts: { lang?: string; rate?: number; pitch?: number; onStart?: () => void; onEnd?: () => void } = {},
): SpeakHandle {
  const handle: SpeakHandle = { cancelled: false };
  if (!voiceAvailable() || !text.trim()) {
    opts.onEnd?.();
    return handle;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const lang = opts.lang ?? 'en-US';
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;
  u.lang = lang;
  u.rate = opts.rate ?? 0.98;
  u.pitch = opts.pitch ?? 0.9; // a touch lower — warm, unhurried melamed
  u.onstart = () => {
    if (!handle.cancelled) opts.onStart?.();
  };
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  synth.speak(u);
  return handle;
}

export function stopSpeaking(): void {
  if (voiceAvailable()) window.speechSynthesis.cancel();
}

// ── Voice commands (best effort — Chrome/Safari; graceful fallback) ──────────

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function recognitionAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function listenOnce(onResult: (transcript: string) => void, onDone: () => void): void {
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as RecognitionCtor | undefined;
  if (!Ctor) {
    onDone();
    return;
  }
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    const transcript = e.results[0]?.[0]?.transcript ?? '';
    if (transcript) onResult(transcript.toLowerCase());
  };
  rec.onend = onDone;
  rec.onerror = onDone;
  rec.start();
}
