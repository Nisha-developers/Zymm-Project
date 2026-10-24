import { RESUMES, APPLICATIONS, COMPANY } from "./mockData";

const DEFAULT_LINE = "Hey Zymm, find me software engineering jobs in New York that pay at least $120k.";
const JOBS = [
  { id: 1, title: "Software Engineer", company: "Google", location: "New York, NY", salary: "$140k–$180k", match: 94 },
  { id: 2, title: "Full Stack Developer", company: "Stripe", location: "New York, NY", salary: "$130k–$170k", match: 91 },
  { id: 3, title: "Frontend Engineer", company: "Datadog", location: "Remote, US", salary: "$120k–$160k", match: 88 },
];
const SCRIPT = {
  jobs: { reply: "I found 24 positions matching your experience. Here are the three strongest matches.", kind: "jobs",
    data: { items: JOBS, stats: { matches: 24, remote: 8, hybrid: 4, range: "$120k–$180k" } } },
  resume: { reply: "Here are your resumes, ranked by how well they fit your target roles.", kind: "resume", data: RESUMES },
  applications: { reply: "Here is where your applications stand right now.", kind: "applications", data: APPLICATIONS },
  company: { reply: "Here is what I found about this company.", kind: "company", data: COMPANY },
};

// Plays the same events the Django backend will send, so the UI never knows the difference.
export class MockSocket {
  constructor() { this.handlers = new Set(); this.timers = []; }
  on(fn) { this.handlers.add(fn); return () => this.handlers.delete(fn); }
  e(ev) { this.handlers.forEach((h) => h(ev)); }
  at(ms, fn) { this.timers.push(setTimeout(fn, ms)); }
  clear() { this.timers.forEach(clearTimeout); this.timers = []; }
  stream(text, step, fn) {
    const w = text.split(" ");
    w.forEach((_, i) => this.at(i * step, () => fn(i, w)));
    return w.length * step;
  }
  connect() { this.at(0, () => this.e({ type: "connection", status: "open" })); }
  close() { this.clear(); }
  send(m) {
    if (m.type === "interrupt") { this.clear(); this.e({ type: "state", state: "idle" }); }
    if (m.type === "text.message") this.run(m.text);
    if (m.type === "audio.start") this.run(DEFAULT_LINE);
  }
  run(line) {
    this.clear();
    const L = line.toLowerCase();
    this.e({ type: "state", state: "listening" });
    const t = this.stream(line, 140, (i, w) => this.e({ type: "transcript.partial", text: w.slice(0, i + 1).join(" ") }));
    this.at(t + 300, () => this.e({ type: "transcript.final", text: line }));
    this.at(t + 600, () => this.e({ type: "state", state: "processing" }));
    if (L.includes("error")) return this.at(t + 2000, () => this.e({ type: "error", message: "Zymm lost connection to the job search service." }));
    const kind = /resume|cv/.test(L) ? "resume" : /applic|email|apply/.test(L) ? "applications" : /company|employer/.test(L) ? "company" : "jobs";
    const s = SCRIPT[kind];
    this.at(t + 2600, () => {
      this.e({ type: "state", state: "speaking" });
      this.e({ type: "tool.result", kind: s.kind, data: s.data });
      const d = this.stream(s.reply, 170, (i, w) => this.e({ type: "text.delta", delta: (i ? " " : "") + w[i] }));
      this.at(d + 1500, () => this.e({ type: "state", state: "idle" }));
    });
  }
}
