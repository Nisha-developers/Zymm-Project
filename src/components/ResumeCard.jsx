import { useState } from "react";
import MatchScore from "./MatchScore";
import { useNav } from "../lib/nav";
import { expand, exportResume } from "../lib/resumes";

export default function ResumeCard({ resume: r }) {
  const { go } = useNav();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState(false);
  const exp = async (f) => { try { await exportResume(expand(r), f); setErr(false); } catch { setErr(true); } setOpen(false); };
  const btn = "flex-1 rounded-lg py-1.5 text-xs font-medium";
  return (
    <article className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-lg backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-9 shrink-0 place-items-center rounded-md border border-zinc-300 bg-white text-[9px] font-bold text-zinc-400">CV</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{r.name}</h3>
          <p className="text-xs text-zinc-600">{r.role} · {r.updated}</p>
        </div>
        <MatchScore value={r.score} />
      </div>
      <div className="mt-3 flex gap-2">
        {open ? (
          <>
            <button onClick={() => exp("pdf")} className={`${btn} bg-zinc-900 text-white`}>PDF</button>
            <button onClick={() => exp("docx")} className={`${btn} bg-zinc-900 text-white`}>Word</button>
            <button onClick={() => setOpen(false)} className={`${btn} border border-zinc-300`}>Cancel</button>
          </>
        ) : (
          <>
            <button onClick={() => go("resumeBuilder", { resume: r })} className={`${btn} border border-zinc-300 hover:bg-white`}>Edit</button>
            <button onClick={() => setOpen(true)} className={`${btn} bg-zinc-900 text-white hover:bg-zinc-700`}>Export</button>
          </>
        )}
      </div>
      {err && <p role="alert" className="mt-2 text-xs text-rose-700">Export failed. Please try again.</p>}
    </article>
  );
}
