import ScreenHeader from "../ScreenHeader";
import { useNav } from "../../lib/nav";
import { ALL_TOPICS } from "../../lib/mockData";

export default function AllTopics() {
  const { go } = useNav();
  return (
    <div className="min-h-full pb-8">
      <ScreenHeader title="All Topics" />
      <div className="space-y-6 px-5">
        {ALL_TOPICS.map((g) => (
          <section key={g.group}>
            <h2 className="mb-2 text-sm font-bold text-zinc-700">{g.group}</h2>
            <div className="grid grid-cols-2 gap-3">
              {g.items.map((t) => (
                <button key={t.title} onClick={() => go("assistant", { prompt: t.prompt })}
                  className="flex h-28 flex-col justify-end rounded-3xl p-4 text-left text-sm font-semibold leading-snug text-white shadow-[0_14px_30px_-14px_rgba(10,20,40,.7)] transition active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                  style={{ background: "radial-gradient(rgba(255,255,255,.07) 1px, transparent 1.2px) 0 0/5px 5px, linear-gradient(160deg,#1b2240,#0e1226)" }}>
                  {t.title}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
