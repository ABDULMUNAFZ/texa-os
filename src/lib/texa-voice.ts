// Browser speech-recognition + TTS playback helpers (client-only).

export type SpeechRec = {
  start: () => void;
  stop: () => void;
};

type SRConstructor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function getSpeechRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.continuous = true;
  r.interimResults = true;
  r.lang = "en-US";
  return r;
}

export function speechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

// Play TTS audio from /api/tts
export async function speak(text: string, onEnd?: () => void): Promise<HTMLAudioElement | null> {
  try {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) throw new Error(`TTS failed: ${r.status}`);
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      onEnd?.();
    };
    await audio.play();
    return audio;
  } catch (err) {
    console.error("[TTS]", err);
    onEnd?.();
    return null;
  }
}

export const WAKE_WORDS = ["hey texa", "hey, texa", "hi texa", "texa"];
export function containsWakeWord(text: string): boolean {
  const t = text.toLowerCase().trim();
  return WAKE_WORDS.some((w) => t.includes(w));
}
export function stripWakeWord(text: string): string {
  let t = text.toLowerCase();
  for (const w of WAKE_WORDS) t = t.replace(w, "");
  return t.replace(/^[,.\s]+/, "").trim();
}
