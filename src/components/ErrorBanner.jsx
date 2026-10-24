export default function ErrorBanner({ message, onRetry }) {
  return (
    <div role="alert" className="flex w-full items-center gap-3 rounded-2xl border border-rose-400/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-900">
      <span className="flex-1">{message}</span>
      <button onClick={onRetry} className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-800">Retry</button>
    </div>
  );
}
