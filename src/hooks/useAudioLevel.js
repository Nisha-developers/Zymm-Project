import { useEffect } from "react";
import { engine } from "../lib/audio/audioEngine";

// Writes level/bass/high (0..1) into refs every frame. No React state, so the orb never causes re-renders.
// Real mic while listening, real server audio while speaking; falls back to a simulated signal (mock mode / no mic).
export function useAudioLevel(state, levelRef, bandsRef) {
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      let b = null;
      if (state === "listening") b = engine.bands("mic");
      else if (state === "speaking" && engine.isPlaying()) b = engine.bands("out");
      if (!b) {
        const l = state === "speaking" ? Math.max(0, 0.45 + 0.35 * Math.sin(t * 7) + 0.15 * Math.sin(t * 13.3))
          : state === "listening" ? Math.max(0, 0.3 + 0.3 * Math.sin(t * 4.2) * Math.sin(t * 1.3)) : 0;
        b = { level: l, bass: l * 0.9, high: l * Math.max(0, Math.sin(t * 9)) };
      }
      levelRef.current = b.level;
      if (bandsRef) bandsRef.current = b;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      levelRef.current = 0;
      if (bandsRef) bandsRef.current = { level: 0, bass: 0, high: 0 };
    };
  }, [state, levelRef, bandsRef]);
}
