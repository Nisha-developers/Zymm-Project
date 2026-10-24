export default function MatchScore({ value, size = 44 }) {
  const r = 18, c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${value}% match`}>
      <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span className="absolute text-[11px] font-bold">{value}</span>
    </div>
  );
}