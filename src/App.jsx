import { useEffect, useMemo, useState } from "react";
import Shell from "./components/Shell";
import Home from "./components/Home/Home";
import ZymmAssistant from "./components/ZymmAssistant/ZymmAssistant";
import AllTopics from "./components/screens/AllTopics";
import JobDetail from "./components/screens/JobDetail";
import Library from "./components/screens/Library";
import ResumeBuilder from "./components/screens/ResumeBuilder";
import ApplyConfirm from "./components/screens/ApplyConfirm";
import { NavContext, readNavigationStack, NAVIGATION_STORAGE_KEY } from "./lib/nav";

export default function App() {
  const [stack, setStack] = useState(() => readNavigationStack(window.sessionStorage));
  const cur = stack[stack.length - 1];
  useEffect(() => {
    window.sessionStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(stack));
  }, [stack]);
  const nav = useMemo(() => ({
    go: (name, params = {}) => setStack((s) => [...s, { name, ...params }]),
    back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    home: () => setStack([{ name: "home" }]),
  }), []);

  const screens = {
    home: <Home onStart={(prompt) => nav.go("assistant", { prompt })} />,
    assistant: <ZymmAssistant initialPrompt={cur.prompt} onBack={nav.back} />,
    topics: <AllTopics />,
    job: <JobDetail job={cur.job} />,
    library: <Library />,
    resumeBuilder: <ResumeBuilder resume={cur.resume} />,
    apply: <ApplyConfirm job={cur.job} />,
  };
  return <NavContext.Provider value={nav}><Shell><div key={stack.length}>{screens[cur.name]}</div></Shell></NavContext.Provider>;
}
