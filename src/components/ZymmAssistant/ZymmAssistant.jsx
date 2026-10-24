import { useEffect, useRef } from "react";
import { useAudioLevel } from "../../hooks/useAudioLevel";
import { useZymmSession } from "../../hooks/useZymmSession";
import ZymmOrb from "./ZymmOrb";
import AssistantStatus from "./AssistantStatus";
import AssistantTranscript from "./AssistantTranscript";
import AssistantResponse from "./AssistantResponse";
import AssistantControls from "./AssistantControls";
import ToolResults from "../ToolResults";
import ErrorBanner from "../ErrorBanner";
export default function ZymmAssistant({ initialPrompt, onBack }) {
  const { state, transcript, reply, jobs, stats, results, error, retry, start, stop } = useZymmSession();
  const bandsRef = useRef({ level: 0, bass: 0, high: 0 });
  const levelRef = useRef(0);
  useAudioLevel(state, levelRef, bandsRef);
  useEffect(() => { start(initialPrompt); }, []); // eslint-disable-line
  const idle = state === "idle" || state === "error";

  return (
    <div className="flex min-h-full flex-col items-center gap-6 px-5 pb-8 pt-6">
      <div className="grid w-full grid-cols-[44px_1fr_44px] items-start">
        <button onClick={() => { stop(); onBack(); }} aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/60 text-zinc-800 backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <AssistantStatus state={state} />
      </div>
      <ZymmOrb state={state} levelRef={levelRef} size={230} bandsRef={bandsRef} />
      {error && <ErrorBanner message={error} onRetry={retry} />}
      <AssistantTranscript text={transcript} />
      <AssistantResponse reply={reply} jobs={jobs} stats={stats} />
      <ToolResults results={results} />
      <div className="mt-auto pt-6"><AssistantControls state={state} onToggle={idle ? () => start() : stop} /></div>
    </div>
  );
}
