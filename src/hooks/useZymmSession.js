import { useCallback, useEffect, useReducer, useRef } from "react";
import { createSocket } from "../lib/socket";
import { engine } from "../lib/audio/audioEngine";
import { USE_MOCK } from "../lib/config";
import { init, reducer } from "../lib/sessionReducer";

export function useZymmSession() {
  const [s, dispatch] = useReducer(reducer, init);
  const sock = useRef(null), last = useRef(undefined), stateRef = useRef("idle");
  stateRef.current = s.state;

  useEffect(() => {
    const k = (sock.current = createSocket());
    const off = k.on((ev) => {
      if (ev.type === "audio.chunk") return engine.playChunk(ev.data);       // Kokoro audio -> speakers (+ orb analyser)
      if ((ev.type === "state" && ev.state !== "listening") || ev.type === "error") engine.stopMic(); // backend ended the turn
      dispatch(ev);
    });
    k.connect();
    return () => { off(); k.close(); engine.stopMic(); engine.stopPlayback(); };
  }, []);

  const start = useCallback(async (prompt) => {
    last.current = prompt;
    engine.stopPlayback();
    dispatch({ type: "reset", state: prompt ? "idle" : "listening" });
    if (prompt) { engine.ensure(); sock.current.send({ type: "text.message", text: prompt }); return; }
    sock.current.send({ type: "audio.start" });
    try {
      await engine.startMic((pcm) => sock.current.send(pcm));
    } catch {
      if (USE_MOCK) return; // mock mode keeps going with a simulated level
      sock.current.send({ type: "interrupt" });
      dispatch({ type: "error", message: "Microphone access was blocked. Allow it in your browser settings, then retry." });
    }
  }, []);

  // While listening, the button means "I'm done talking"; otherwise it interrupts Zymm.
  const stop = useCallback(() => {
    engine.stopMic();
    if (stateRef.current === "listening") {
      sock.current.send({ type: "audio.end" });
      dispatch({ type: "state", state: "processing" });
    } else {
      engine.stopPlayback();
      sock.current.send({ type: "interrupt" });
      dispatch({ type: "state", state: "idle" });
    }
  }, []);
  const retry = useCallback(() => start(last.current), [start]);

  const found = s.results.find((r) => r.type === "jobs");
  return { ...s, jobs: found?.data.items ?? [], stats: found?.data.stats ?? {}, start, stop, retry, setState: (state) => dispatch({ type: "state", state }) };
}
