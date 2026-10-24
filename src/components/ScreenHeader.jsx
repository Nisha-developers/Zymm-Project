import { useNav } from "../lib/nav";
export default function ScreenHeader({ title, right }) {
  const { back } = useNav();
  return (
    <header className="grid grid-cols-[44px_1fr_44px] items-center px-5 pb-4 pt-6">
      <button onClick={back} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-white/60 text-zinc-800 backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <h1 className="text-center text-base font-semibold">{title}</h1>
      <div className="justify-self-end">{right}</div>
    </header>
  );
}