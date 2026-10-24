import { useState } from "react";

const USER_NAME = "Nisha";
const CHIPS = ["Start New Job Hunt Campaign", "Email Hiring Managers", "Resume Performance Analysis", "Tailor My Resume", "Generate Analysis"];
const ICONS = {
  search: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4" /></>,
  doc: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></>,
  send: <path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" />,
  spark: <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />,
  mic: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
};
const Icon = ({ n, s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONS[n]}</svg>
);
const TOPICS = [
  { icon: "search", title: "Find jobs that fit", sub: "Search by role, city and salary", prompt: "Find me software engineering jobs in New York that pay at least $120k." },
  { icon: "doc", title: "Build my resume", sub: "Tailored to each role", prompt: "Tailor my resume for a senior frontend role." },
  { icon: "send", title: "Apply for me", sub: "Submit to your best matches", prompt: "Apply to my top five matches." },
  { icon: "spark", title: "Prepare interviews", sub: "Practice with Zymm", prompt: "Help me prepare for a product design interview." },
];
const DESKTOPDESIGN = [
  { icon: "search", title: "Find jobs that fit", sub: "Search by role, city and salary", prompt: "Find me software engineering jobs in New York that pay at least $120k." },
  { icon: "doc", title: "Build my resume", sub: "Tailored to each role", prompt: "Tailor my resume for a senior frontend role." },
  { icon: "send", title: "Apply for me", sub: "Submit to your best matches", prompt: "Apply to my top five matches." },
  { icon: "spark", title: "Prepare interviews", sub: "Practice with Zymm", prompt: "Help me prepare for a product design interview." }
]

export default function Home({ onStart }) {
  const [text, setText] = useState("");
  const submit = (e) => { e.preventDefault(); onStart(text.trim() || undefined); };

  return (
    <div className="flex min-h-full flex-col px-5 pt-2">
      <img src="https://zymm.ai/zymm-sidebar-logo.svg" className="w-40" alt="zymm Ai" />
      <header className="text-center mt-[1rem]">
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">Hi, {USER_NAME}!<br />How can I help you today?</h1>
        <p className="mt-2 text-sm text-zinc-500">Your personal headhunter. Search, tailor, apply.</p>
      </header>

      <div className="mt-6 flex flex-wrap justify-center gap-2 overflow-y-hidden md:hidden">
        {CHIPS.map((c) => (
          <button key={c} onClick={() => onStart(c)}
            className="rounded-full border border-white/50 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-medium text-emerald-950/70 backdrop-blur transition hover:bg-emerald-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
            {c}
          </button>
        ))}
      </div>
        <h2 className="text-lg font-bold text-white [text-shadow:0_1px_8px_rgba(0,0,0,.25)] my-[1rem]">Popular Functions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TOPICS.map((t) => (
          <button key={t.title} onClick={() => onStart(t.prompt)}
            className="group flex h-36 flex-col justify-between rounded-3xl p-4 text-left text-white shadow-[0_14px_30px_-14px_rgba(10,20,40,.7)] transition active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
            style={{ background: "radial-gradient(rgba(255,255,255,.07) 1px, transparent 1.2px) 0 0/5px 5px, linear-gradient(160deg,#1b2240,#0e1226)" }}>
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-emerald-300"><Icon n={t.icon} /></span>
            <span>
              <span className="block text-sm font-semibold leading-snug">{t.title}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-white/60">{t.sub}</span>
            </span>
          </button>
        ))}
         {DESKTOPDESIGN.map((t) => (
          <button key={t.title} onClick={() => onStart(t.prompt)}
            className="group flex h-36 flex-col justify-between rounded-3xl p-4 text-left text-white shadow-[0_14px_30px_-14px_rgba(10,20,40,.7)] transition active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 max-md:hidden"
            style={{ background: "radial-gradient(rgba(255,255,255,.07) 1px, transparent 1.2px) 0 0/5px 5px, linear-gradient(160deg,#1b2240,#0e1226)" }}>
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-emerald-300"><Icon n={t.icon} /></span>
            <span>
              <span className="block text-sm font-semibold leading-snug">{t.title}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-white/60">{t.sub}</span>
            </span>
          </button>
        ))}
        
      </div>

      <form onSubmit={submit} className="sticky bottom-0 -mx-5 mt-auto flex items-center gap-3 px-5 pb-6 pt-8"
        style={{ background: "linear-gradient(to top, rgba(183,188,183,.9), transparent)" }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask Zymm to find, tailor or apply…"
          className="h-12 min-w-0 flex-1 rounded-full border border-white/70 bg-white/90 px-5 text-sm shadow-inner outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-400" />
        <button type="submit" aria-label="Talk to Zymm"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-b from-green-200 via-green-400 to-green-600 text-zinc-900 shadow-[0_8px_22px_-6px_rgba(0,255,102,.75)] transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">
          <Icon n="mic" s={20} />
        </button>
      </form>
    </div>
  );
}
