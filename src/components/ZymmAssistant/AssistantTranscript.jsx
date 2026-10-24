export default function AssistantTranscript({ text }) {
  if (!text) return null;
  return (
    <p className="max-w-xs text-base leading-snug text-white [text-shadow:0_1px_6px_rgba(0,0,0,.35)]">
      {text}<span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-white align-middle" />
    </p>
  );
}
