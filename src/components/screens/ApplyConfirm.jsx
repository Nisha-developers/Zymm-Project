import { useState } from "react";
import ScreenHeader from "../ScreenHeader";
import MatchScore from "../MatchScore";
import { Initial } from "../CompanyCard";
import { useNav } from "../../lib/nav";
import { api } from "../../lib/api";
import { RESUMES } from "../../lib/mockData";

const draft = (job, resume) =>
  `Hello ${job.company} team,\n\nI'm excited to apply for the ${job.title} role. My background as a ${resume.role} fits what you're looking for, and I'd love to bring that experience to ${job.company}.\n\nThank you for your time.`;

export default function ApplyConfirm({ job }) {
  const { go, home } = useNav();
  const [resumeId, setResumeId] = useState(RESUMES[0].id);
  const [withLetter, setWithLetter] = useState(true);
  const [cover, setCover] = useState(() => draft(job, RESUMES[0]));
  const [sure, setSure] = useState(false);
  const [phase, setPhase] = useState("review"); // review | sending | done | error

  const pick = (r) => { setResumeId(r.id); setCover(draft(job, r)); };
  const submit = async () => {
    setPhase("sending");
    try {
      await api.createApplication({ jobId: job.id, resumeId, coverLetter: withLetter ? cover : null });
      await new Promise((r) => setTimeout(r, 700));
      setPhase("done");
    } catch { setPhase("error"); }
  };

  if (phase === "done") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-b from-green-200 to-green-500 text-3xl shadow-[0_10px_30px_-8px_rgba(0,255,102,.7)]">✓</span>
        <h1 className="text-xl font-extrabold">Application submitted</h1>
        <p className="text-sm text-zinc-600">Zymm sent your application for {job.title} at {job.company}.</p>
        <button onClick={() => go("library")} className="mt-2 h-12 w-full rounded-full bg-zinc-900 text-sm font-semibold text-white">View my applications</button>
        <button onClick={home} className="h-12 w-full rounded-full border border-zinc-300 bg-white/80 text-sm font-semibold">Back to home</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader title="Review & Apply" />
      <div className="space-y-4 px-5 pb-4">
        <section className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-lg backdrop-blur">
          <Initial name={job.company} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">{job.title}</h2>
            <p className="text-xs text-zinc-600">{job.company} · {job.salary}</p>
          </div>
          <MatchScore value={job.match} />
        </section>

        <fieldset>
          <legend className="mb-2 text-sm font-bold">Resume to send</legend>
          <div className="space-y-2">
            {RESUMES.map((r) => (
              <label key={r.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm backdrop-blur ${resumeId === r.id ? "border-emerald-500 bg-emerald-500/10" : "border-white/60 bg-white/60"}`}>
                <input type="radio" name="resume" checked={resumeId === r.id} onChange={() => pick(r)} className="accent-emerald-600" />
                <span className="flex-1"><b className="block text-sm">{r.name}</b><span className="text-xs text-zinc-600">{r.role} · {r.updated}</span></span>
                <MatchScore value={r.score} size={36} />
              </label>
            ))}
          </div>
        </fieldset>

        <section>
          <label className="mb-2 flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={withLetter} onChange={(e) => setWithLetter(e.target.checked)} className="accent-emerald-600" />Include a cover letter
          </label>
          {withLetter && <textarea aria-label="Cover letter" rows={7} value={cover} onChange={(e) => setCover(e.target.value)}
            className="w-full rounded-2xl border border-white/70 bg-white/80 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />}
        </section>

        <label className="flex items-start gap-2 rounded-2xl bg-amber-400/15 p-3 text-xs text-amber-950">
          <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-0.5 accent-emerald-600" />
          I've reviewed the resume and cover letter, and I want Zymm to submit this application for me.
        </label>
        {phase === "error" && <p role="alert" className="rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-900">The application didn't go through. Nothing was sent. Please try again.</p>}
      </div>
      <div className="sticky bottom-0 mt-auto px-5 pb-6 pt-6" style={{ background: "linear-gradient(to top, rgba(200,204,200,.95), transparent)" }}>
        <button onClick={submit} disabled={!sure || phase === "sending"}
          className="h-12 w-full rounded-full bg-zinc-900 text-sm font-semibold text-white transition disabled:opacity-40">
          {phase === "sending" ? "Submitting…" : phase === "error" ? "Try again" : "Submit application"}
        </button>
      </div>
    </div>
  );
}
