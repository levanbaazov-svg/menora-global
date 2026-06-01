'use client';

// Voice input using the Web Speech API.
// - Chrome / Safari / Edge support webkitSpeechRecognition.
// - Firefox does not — we fall back to text-only input gracefully.
// - Interim transcripts are streamed so the user sees what's being recognized.

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

type SpeechRecognitionResult = {
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
  resultIndex: number;
};

interface RecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionResult) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface WindowWithSpeech extends Window {
  webkitSpeechRecognition?: new () => RecognitionInstance;
  SpeechRecognition?: new () => RecognitionInstance;
}

interface Props {
  onTranscript: (text: string, isFinal: boolean) => void;
  /** Called once when first user interaction marks Speech API as supported. */
  onSupportDetected?: (supported: boolean) => void;
  lang?: string;
}

export function VoiceInput({
  onTranscript, onSupportDetected, lang = 'ru-RU',
}: Props) {
  const t = useTranslations('aiMisc');
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const recRef = useRef<RecognitionInstance | null>(null);

  useEffect(() => {
    const w = window as unknown as WindowWithSpeech;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    const ok = Boolean(Ctor);
    setSupported(ok);
    onSupportDetected?.(ok);
  }, [onSupportDetected]);

  const start = () => {
    const w = window as unknown as WindowWithSpeech;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    let finalChunks = '';

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript;
        if (r.isFinal) {
          finalChunks += text;
        } else {
          interim += text;
        }
      }
      const combined = (finalChunks + interim).trim();
      if (combined) onTranscript(combined, false);
    };
    rec.onerror = (err) => {
      // eslint-disable-next-line no-console
      console.warn('[voice] error', err.error);
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      if (finalChunks.trim()) onTranscript(finalChunks.trim(), true);
    };

    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  if (supported === false) {
    return (
      <button
        type="button"
        disabled
        title={t('voiceUnavailable')}
        className="w-14 h-14 rounded-full bg-(--color-muted-bg) text-(--color-fg-subtle) flex items-center justify-center cursor-not-allowed"
      >
        🎙
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      aria-label={listening ? t('stopRecording') : t('startRecording')}
      className={`
        w-14 h-14 rounded-full flex items-center justify-center text-2xl
        transition-all duration-200 shrink-0
        ${listening
          ? 'bg-(--color-danger) text-white scale-110 shadow-[0_0_0_8px_rgba(220,38,38,0.18)]'
          : 'bg-(--color-deep) text-white hover:scale-105 active:scale-95 shadow-[var(--shadow-md)]'}
      `}
    >
      {listening ? (
        <span className="inline-block w-3 h-3 bg-white rounded-sm" />
      ) : (
        '🎙'
      )}
    </button>
  );
}
