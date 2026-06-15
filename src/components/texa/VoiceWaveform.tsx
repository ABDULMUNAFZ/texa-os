import { useEffect, useRef } from "react";

export function VoiceWaveform({
  active,
  bars = 24,
  className,
}: {
  active: boolean;
  bars?: number;
  className?: string;
}) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    let analyser: AnalyserNode | null = null;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let data: Uint8Array<ArrayBuffer> | null = null;

    async function setup() {
      if (!active) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        src.connect(analyser);
        data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        const tick = () => {
          if (!analyser || !data) return;
          analyser.getByteFrequencyData(data);
          for (let i = 0; i < bars; i++) {
            const v = (data[i % data.length] ?? 0) / 255;
            const el = refs.current[i];
            if (el) el.style.transform = `scaleY(${0.15 + v * 1.1})`;
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        /* mic denied — fall back to fake animation via CSS */
      }
    }
    setup();
    return () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
    };
  }, [active, bars]);

  return (
    <div className={`flex items-center justify-center gap-[3px] h-8 ${className ?? ""}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="w-[3px] rounded-full bg-[color:var(--color-neon)]"
          style={{
            height: "100%",
            transformOrigin: "center",
            transform: "scaleY(0.3)",
            transition: "transform 80ms linear",
            animation: active ? undefined : `wave 1.2s ease-in-out ${i * 40}ms infinite`,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}
