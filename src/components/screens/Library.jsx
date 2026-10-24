import { useState } from "react";
import ScreenHeader from "../ScreenHeader";
import ConversationHistory from "../ConversationHistory";
import ResumeCard from "../ResumeCard";
import ApplicationCard from "../ApplicationCard";
import { useNav } from "../../lib/nav";
import { CONVERSATIONS, RESUMES, APPLICATIONS } from "../../lib/mockData";

const TABS = ["Conversations", "Resumes", "Applications"];
export default function Library() {
  const { go } = useNav();
  const [tab, setTab] = useState(TABS[0]);
  return (
    <div className="min-h-full pb-8">
      <ScreenHeader title="My Activity" />
      <div role="tablist" className="mx-5 mb-4 grid grid-cols-3 rounded-full bg-white/50 p-1 backdrop-blur">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`rounded-full py-2 text-xs font-semibold transition ${tab === t ? "bg-zinc-900 text-white shadow" : "text-zinc-600"}`}>{t}</button>
        ))}
      </div>
      <div className="space-y-3 px-5">
        {tab === "Conversations" && <ConversationHistory items={CONVERSATIONS} />}
        {tab === "Resumes" && (
          <>
            <button onClick={() => go("resumeBuilder", {})} className="w-full rounded-2xl border border-dashed border-zinc-400 py-3 text-sm font-semibold text-zinc-700 hover:bg-white/60">+ New resume</button>
            {RESUMES.map((r) => <ResumeCard key={r.id} resume={r} />)}
          </>
        )}
        {tab === "Applications" && APPLICATIONS.map((a) => <ApplicationCard key={a.id} application={a} />)}
      </div>
    </div>
  );
}
