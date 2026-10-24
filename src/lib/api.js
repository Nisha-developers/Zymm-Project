import { API_URL, USE_MOCK, getClientId } from "./config";
import * as mock from "./mockData";

async function req(path, opts = {}) {
  const r = await fetch(API_URL + path, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-Client-Id": getClientId(), ...opts.headers },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
const qs = (p) => new URLSearchParams(Object.entries(p).filter(([, v]) => v != null && v !== "")).toString();
const pick = (m, real) => (USE_MOCK ? Promise.resolve(m) : real());

export const api = {
  searchJobs: (p) => pick([], () => req(`/api/jobs/search?${qs(p)}`)),
  getJob: (id) => pick(null, () => req(`/api/jobs/${id}`)),
  listResumes: () => pick(mock.RESUMES, () => req("/api/resumes")),
  listApplications: () => pick(mock.APPLICATIONS, () => req("/api/applications")),
  listConversations: () => pick(mock.CONVERSATIONS, () => req("/api/conversations")),
  createApplication: (body) => pick({ ok: true }, () => req("/api/applications", { method: "POST", body: JSON.stringify(body) })),
};
