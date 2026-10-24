import { STATE_COPY } from "../../lib/constants";

export default function AssistantStatus({ state }) {
  return (
    <header className="text-center">
      <h1 className="text-lg font-semibold text-zinc-900">Personal Assistant</h1>
      <p aria-live="polite" className={`mt-1 text-sm ${state === "error" ? "text-red-600" : "text-zinc-500"}`}>
        {STATE_COPY[state]}
      </p>
    </header>
  );
}
