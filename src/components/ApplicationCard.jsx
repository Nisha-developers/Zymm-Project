import { Initial } from "./CompanyCard";
const TONE = {
  Submitted: "bg-sky-500/15 text-sky-800", "In review": "bg-amber-400/20 text-amber-800",
  Interview: "bg-green-500/15 text-green-800", Rejected: "bg-rose-500/15 text-rose-800",
};
export default function ApplicationCard({ application: a }) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-lg backdrop-blur">
      <Initial name={a.company} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold">{a.title}</h3>
        <p className="text-xs text-zinc-600">{a.company} · Applied {a.date}</p>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[a.status]}`}>{a.status}</span>
    </article>
  );
}