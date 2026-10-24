export const Initial = ({ name, size = "h-11 w-11" }) => (
  <span className={`grid ${size} shrink-0 place-items-center rounded-xl bg-zinc-900 text-sm font-bold text-emerald-300`}>{name[0]}</span>
);
export default function CompanyCard({ company: c }) {
  return (
    <article className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-lg backdrop-blur">
      <div className="flex items-center gap-3">
        <Initial name={c.name} />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{c.name}</h3>
          <p className="text-xs text-zinc-600">{c.industry} · {c.size}</p>
        </div>
        <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-800">★ {c.rating}</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-zinc-700">{c.blurb}</p>
      <p className="mt-2 text-xs text-zinc-500">{c.location} · {c.openRoles} open roles</p>
    </article>
  );
}