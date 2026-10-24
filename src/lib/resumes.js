import { API_URL, USE_MOCK, getClientId } from "./config";

export const DEFAULT_RESUME = {
  title: "Untitled resume", fullName: "Alex Morgan", role: "Software Engineer",
  email: "alex@example.com", phone: "+1 555 0100", location: "New York, NY",
  summary: "Full-stack engineer with 4 years of experience building React and Django products.",
  experience: [{ id: 1, role: "Software Engineer", company: "Acme Inc.", dates: "2022 – Present", bullets: "Built a customer dashboard used by 20k users\nCut page load time by 40%" }],
  education: [{ id: 1, school: "State University", degree: "B.Sc. Computer Science", dates: "2018 – 2022" }],
  skills: ["React", "Tailwind CSS", "Django", "SQL"],
};
// List items only carry id/name/role; fill the rest from the template until the backend returns full resumes.
export const expand = (r) => ({ ...DEFAULT_RESUME, id: r.id, title: r.name, role: r.role });

const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const slug = (s) => (s || "resume").toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function resumeToHtml(r) {
  const li = (t) => t.split("\n").filter(Boolean).map((b) => `<li>${esc(b)}</li>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.title)}</title><style>
body{font-family:Arial,sans-serif;color:#111;margin:40px;font-size:12px;line-height:1.45}h1{font-size:24px;margin:0}
h2{font-size:12px;letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid #999;padding-bottom:3px;margin:18px 0 8px}
.sub{color:#444}.row{display:flex;justify-content:space-between;font-weight:bold}ul{margin:4px 0 0 18px;padding:0}</style></head><body>
<h1>${esc(r.fullName)}</h1><div class="sub">${[r.role, r.email, r.phone, r.location].map(esc).join(" · ")}</div>
<h2>Summary</h2><p>${esc(r.summary)}</p>
<h2>Experience</h2>${r.experience.map((e) => `<div class="row"><span>${esc(e.role)}, ${esc(e.company)}</span><span>${esc(e.dates)}</span></div><ul>${li(e.bullets)}</ul>`).join("")}
<h2>Education</h2>${r.education.map((e) => `<div class="row"><span>${esc(e.degree)}, ${esc(e.school)}</span><span>${esc(e.dates)}</span></div>`).join("")}
<h2>Skills</h2><p>${r.skills.map(esc).join(" · ")}</p></body></html>`;
}

function download(blob, name) {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function printHtml(html) {
  const f = Object.assign(document.createElement("iframe"), {});
  f.style.cssText = "position:fixed;width:0;height:0;border:0";
  document.body.appendChild(f);
  f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 1500); }, 200);
}

// Real mode: backend builds the file. Mock mode: PDF = browser print dialog ("Save as PDF"), Word = HTML opened by Word.
export async function exportResume(r, fmt = "pdf") {
  if (!USE_MOCK && r.id) {
    const res = await fetch(`${API_URL}/api/resumes/${r.id}/export?format=${fmt}`, { headers: { "X-Client-Id": getClientId() } });
    if (!res.ok) throw new Error("Export failed");
    return download(await res.blob(), `${slug(r.title)}.${fmt}`);
  }
  const html = resumeToHtml(r);
  if (fmt === "docx") return download(new Blob([html], { type: "application/msword" }), `${slug(r.title)}.doc`);
  printHtml(html);
}

export async function saveResume(r) {
  if (USE_MOCK) return new Promise((ok) => setTimeout(() => ok({ ok: true }), 400));
  const res = await fetch(`${API_URL}/api/resumes${r.id ? `/${r.id}` : ""}`, {
    method: r.id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json", "X-Client-Id": getClientId() },
    body: JSON.stringify(r),
  });
  if (!res.ok) throw new Error("Save failed");
  return res.json();
}
