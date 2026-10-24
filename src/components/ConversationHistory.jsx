import { useNav } from "../lib/nav";
export default function ConversationHistory({ items }) {
  const { go } = useNav();
  return (
    <ul className="space-y-2">
      {items.map((c) => (
        <li key={c.id}>
          <button onClick={() => go("assistant", { prompt: c.title })}
            className="w-full rounded-2xl border border-white/60 bg-white/70 p-4 text-left shadow-lg backdrop-blur transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="truncate text-sm font-semibold">{c.title}</h3>
              <span className="shrink-0 text-xs text-zinc-500">{c.time}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-600">{c.preview}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}