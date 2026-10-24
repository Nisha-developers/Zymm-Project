import JobCard from "../JobCard";

export default function AssistantResponse({ reply, jobs, stats }) {
  if (!reply && !jobs.length) return null;
  return (
    <section className="w-full space-y-3">
      {reply && (
        <p className="text-sm text-zinc-800"><span className="font-semibold">Zymm:</span> {reply}</p>
      )}
      {jobs.length > 0 && (
        <>
          <dl className="flex flex-wrap gap-2 text-xs text-zinc-800">
            {[[stats.matches, "matches"], [stats.remote, "remote"], [stats.hybrid, "hybrid"], [stats.range, "salary range"]].map(([v, l]) => (
              <div key={l} className="rounded-full bg-white/60 px-3 py-1 backdrop-blur">
                <dt className="sr-only">{l}</dt><dd><b>{v}</b> {l}</dd>
              </div>
            ))}
          </dl>
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {jobs.map((j) => <li key={j.id} className="snap-start"><JobCard job={j} /></li>)}
          </ul>
        </>
      )}
    </section>
  );
}
