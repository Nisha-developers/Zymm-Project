import { useNav } from "../lib/nav";


export default function JobCard({ job }) {
  const { go } = useNav();
  return (
    <article className="w-64 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{job.title}</h3>
          <p className="text-xs text-zinc-600">{job.company} · {job.location}</p>
        </div>
        <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-700">{job.match}% match</span>
      </div>
      <p className="mt-3 text-sm font-medium text-zinc-800">{job.salary}</p>
      <div className="mt-3 flex gap-2">
        <button className="flex-1 rounded-lg border border-zinc-300 py-1.5 text-xs font-medium text-zinc-800 hover:bg-white" onClick={() => go("job", { job })}>View Job</button>
        <button className="flex-1 rounded-lg bg-zinc-900 py-1.5 text-xs font-medium text-white hover:bg-zinc-700">Apply</button>
      </div>
    </article>
  );
}
