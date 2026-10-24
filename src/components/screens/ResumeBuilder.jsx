import { useState } from "react";
import ScreenHeader from "../ScreenHeader";
import { useNav } from "../../lib/nav";
import { DEFAULT_RESUME, expand, exportResume, saveResume } from "../../lib/resumes";

const inp = "w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400";
const Field = ({ label, children }) => <label className="block text-xs font-medium text-zinc-600">{label}<div className="mt-1">{children}</div></label>;
const Card = ({ title, action, children }) => (
  <section className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-lg backdrop-blur">
    <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">{title}</h2>{action}</div>
    <div className="space-y-3">{children}</div>
  </section>
);
const Link = ({ onClick, children }) => <button type="button" onClick={onClick} className="text-xs font-semibold text-emerald-800 hover:underline">{children}</button>;

export default function ResumeBuilder({ resume }) {
  const { go } = useNav();
  const [r, setR] = useState(() => (resume ? expand(resume) : { ...DEFAULT_RESUME, title: "New resume" }));
  const [tab, setTab] = useState("edit");
  const [status, setStatus] = useState("");
  const [skill, setSkill] = useState("");
  const set = (k, v) => { setR((p) => ({ ...p, [k]: v })); setStatus(""); };
  const upd = (key, id, k, v) => set(key, r[key].map((x) => (x.id === id ? { ...x, [k]: v } : x)));
  const add = (key, blank) => set(key, [...r[key], { ...blank, id: Date.now() }]);
  const del = (key, id) => set(key, r[key].filter((x) => x.id !== id));
  const save = async () => { setStatus("saving"); try { await saveResume(r); setStatus("saved"); } catch { setStatus("error"); } };
  const exp = async (f) => { try { await exportResume(r, f); } catch { setStatus("error"); } };
  const addSkill = () => { const s = skill.trim(); if (s && !r.skills.includes(s)) set("skills", [...r.skills, s]); setSkill(""); };

  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader title="Resume Builder" />
      <div className="px-5">
        <div role="tablist" className="mb-4 grid grid-cols-2 rounded-full bg-white/50 p-1 backdrop-blur">
          {["edit", "preview"].map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`rounded-full py-2 text-xs font-semibold capitalize ${tab === t ? "bg-zinc-900 text-white shadow" : "text-zinc-600"}`}>{t}</button>
          ))}
        </div>
      </div>

      {tab === "edit" ? (
        <div className="space-y-4 px-5 pb-4">
          <Card title="Resume name"><input className={inp} value={r.title} onChange={(e) => set("title", e.target.value)} /></Card>
          <Card title="Personal details">
            <Field label="Full name"><input className={inp} value={r.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
            <Field label="Target role"><input className={inp} value={r.role} onChange={(e) => set("role", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email"><input className={inp} value={r.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Phone"><input className={inp} value={r.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            </div>
            <Field label="Location"><input className={inp} value={r.location} onChange={(e) => set("location", e.target.value)} /></Field>
          </Card>
          <Card title="Summary" action={<Link onClick={() => go("assistant", { prompt: `Rewrite my resume summary for a ${r.role} role.` })}>Improve with Zymm</Link>}>
            <textarea rows={4} className={inp} value={r.summary} onChange={(e) => set("summary", e.target.value)} />
          </Card>
          <Card title="Experience" action={<Link onClick={() => add("experience", { role: "", company: "", dates: "", bullets: "" })}>+ Add</Link>}>
            {r.experience.map((x) => (
              <div key={x.id} className="space-y-2 rounded-xl bg-white/50 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input aria-label="Role" placeholder="Role" className={inp} value={x.role} onChange={(e) => upd("experience", x.id, "role", e.target.value)} />
                  <input aria-label="Company" placeholder="Company" className={inp} value={x.company} onChange={(e) => upd("experience", x.id, "company", e.target.value)} />
                </div>
                <input aria-label="Dates" placeholder="Dates" className={inp} value={x.dates} onChange={(e) => upd("experience", x.id, "dates", e.target.value)} />
                <textarea aria-label="Achievements" rows={3} placeholder="One achievement per line" className={inp} value={x.bullets} onChange={(e) => upd("experience", x.id, "bullets", e.target.value)} />
                <div className="text-right"><button type="button" onClick={() => del("experience", x.id)} className="text-xs text-rose-700 hover:underline">Remove</button></div>
              </div>
            ))}
          </Card>
          <Card title="Education" action={<Link onClick={() => add("education", { school: "", degree: "", dates: "" })}>+ Add</Link>}>
            {r.education.map((x) => (
              <div key={x.id} className="space-y-2 rounded-xl bg-white/50 p-3">
                <input aria-label="School" placeholder="School" className={inp} value={x.school} onChange={(e) => upd("education", x.id, "school", e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input aria-label="Degree" placeholder="Degree" className={inp} value={x.degree} onChange={(e) => upd("education", x.id, "degree", e.target.value)} />
                  <input aria-label="Dates" placeholder="Dates" className={inp} value={x.dates} onChange={(e) => upd("education", x.id, "dates", e.target.value)} />
                </div>
                <div className="text-right"><button type="button" onClick={() => del("education", x.id)} className="text-xs text-rose-700 hover:underline">Remove</button></div>
              </div>
            ))}
          </Card>
          <Card title="Skills">
            <div className="flex flex-wrap gap-2">
              {r.skills.map((s) => (
                <span key={s} className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-950">
                  {s}<button type="button" aria-label={`Remove ${s}`} onClick={() => set("skills", r.skills.filter((x) => x !== s))} className="text-emerald-900/70">×</button>
                </span>
              ))}
            </div>
            <input className={inp} placeholder="Type a skill and press Enter" value={skill} onChange={(e) => setSkill(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
          </Card>
        </div>
      ) : (
        <article className="mx-5 mb-4 rounded-lg bg-white p-6 text-[11px] leading-relaxed text-zinc-900 shadow-xl">
          <h2 className="text-xl font-bold">{r.fullName}</h2>
          <p className="text-zinc-600">{[r.role, r.email, r.phone, r.location].filter(Boolean).join(" · ")}</p>
          <h3 className="mb-1 mt-4 border-b border-zinc-300 pb-0.5 text-[10px] font-bold uppercase tracking-widest">Summary</h3>
          <p>{r.summary}</p>
          <h3 className="mb-1 mt-4 border-b border-zinc-300 pb-0.5 text-[10px] font-bold uppercase tracking-widest">Experience</h3>
          {r.experience.map((x) => (
            <div key={x.id} className="mb-2">
              <p className="flex justify-between font-bold"><span>{x.role}, {x.company}</span><span>{x.dates}</span></p>
              <ul className="ml-4 list-disc">{x.bullets.split("\n").filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          ))}
          <h3 className="mb-1 mt-4 border-b border-zinc-300 pb-0.5 text-[10px] font-bold uppercase tracking-widest">Education</h3>
          {r.education.map((x) => <p key={x.id} className="flex justify-between font-bold"><span>{x.degree}, {x.school}</span><span>{x.dates}</span></p>)}
          <h3 className="mb-1 mt-4 border-b border-zinc-300 pb-0.5 text-[10px] font-bold uppercase tracking-widest">Skills</h3>
          <p>{r.skills.join(" · ")}</p>
        </article>
      )}

      <div className="sticky bottom-0 mt-auto px-5 pb-6 pt-6" style={{ background: "linear-gradient(to top, rgba(200,204,200,.95), transparent)" }}>
        <p aria-live="polite" className={`mb-2 text-center text-xs ${status === "error" ? "text-rose-700" : "text-zinc-600"}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : status === "error" ? "Something failed. Please try again." : "\u00A0"}
        </p>
        <div className="grid grid-cols-3 gap-2 text-sm font-semibold">
          <button onClick={save} className="h-11 rounded-full bg-zinc-900 text-white">Save</button>
          <button onClick={() => exp("pdf")} className="h-11 rounded-full border border-zinc-300 bg-white/80">PDF</button>
          <button onClick={() => exp("docx")} className="h-11 rounded-full border border-zinc-300 bg-white/80">Word</button>
        </div>
      </div>
    </div>
  );
}
