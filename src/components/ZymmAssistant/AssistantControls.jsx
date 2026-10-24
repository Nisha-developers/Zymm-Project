export default function AssistantControls({ state, onToggle }) {
  const active = state !== "idle" && state !== "error";
  return (
    <div className="relative grid place-items-center">
      {active && <span className="absolute h-24 w-24 animate-ping rounded-full bg-green-400/30" />}
      <span className="absolute h-20 w-20 rounded-full border border-white/50" />
      <button onClick={onToggle} aria-label={active ? "Stop" : "Talk to Zymm"}
        className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-b from-green-200 via-green-400 to-green-500 text-zinc-900 shadow-[0_8px_24px_-6px_rgba(0,255,102,.7)] transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-600">
        {active ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="3" /></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        )}
      </button>
    </div>
  );
}
