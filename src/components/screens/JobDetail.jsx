import ScreenHeader from "../ScreenHeader";
import MatchScore from "../MatchScore";
import CompanyCard, { Initial } from "../CompanyCard";
import { useNav } from "../../lib/nav";
import { COMPANY, JOB_EXTRA as X } from "../../lib/mockData";

export default function JobDetail({ job }) {
  const { go } = useNav();
  const ask = (prompt) => go("assistant", { prompt });
  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader title="Job Details" />
      <div className="space-y-5 px-5 pb-4">
        <section className="flex items-center gap-3">
          <Initial name={job.company} size="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold leading-tight">{job.title}</h2>
            <p className="text-sm text-zinc-600">{job.company} · {job.location}</p>
          </div>
          <MatchScore value={job.match} size={56} />
        </section>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-white/70 px-3 py-1">{job.salary}</span>
          <span className="rounded-full bg-white/70 px-3 py-1">{X.type}</span>
        </div>
        <section className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4">
          <h3 className="mb-2 text-sm font-bold text-emerald-900">Why Zymm picked this for you</h3>
          <ul className="space-y-1.5 text-xs text-emerald-950/80">{X.whyMatch.map((w) => <li key={w}>✓ {w}</li>)}</ul>
        </section>
        <section>
          <h3 className="mb-1 text-sm font-bold">About the role</h3>
          <p className="text-xs leading-relaxed text-zinc-700">{X.about}</p>
        </section>
        <section>
          <h3 className="mb-1 text-sm font-bold">Requirements</h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-700">{X.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
        </section>
        <CompanyCard company={{ ...COMPANY, name: job.company }} />
      </div>
      <div className="sticky bottom-0 mt-auto flex gap-3 px-5 pb-6 pt-6" style={{ background: "linear-gradient(to top, rgba(200,204,200,.95), transparent)" }}>
        <button onClick={() => ask(`Tell me more about the ${job.title} role at ${job.company}.`)} className="h-12 flex-1 rounded-full border border-zinc-300 bg-white/80 text-sm font-semibold">Ask Zymm</button>
        <button onClick={() => go("apply", { job })} className="h-12 flex-1 rounded-full bg-zinc-900 text-sm font-semibold text-white">Apply</button>
      </div>
    </div>
  );
}
