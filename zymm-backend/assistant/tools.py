"""The four tools Qwen3 may call. Results go two places: a compact JSON back to the model, and `tool.result` cards to the UI.
Safety rule: apply_to_job NEVER applies. It only proposes; the user must confirm in the UI (`apply.confirm`)."""
import re
from dataclasses import dataclass, field

from channels.db import database_sync_to_async

from .models import Application, Company, Job, Resume
from .search import job_json, latest_resume_data, search_jobs
from .services import completeness, ago, date_label

MAX_JOBS = 5


@dataclass
class Outcome:
    model: dict                                  # what Qwen3 sees
    ui: list = field(default_factory=list)       # [(kind, data)] -> tool.result events
    note: str = ""                               # one line kept in chat history so follow-ups ("the first one") work


def _fn(name, desc, props, required=()):
    return {"type": "function", "function": {"name": name, "description": desc,
            "parameters": {"type": "object", "properties": props, "required": list(required)}}}


SCHEMAS = [
    _fn("search_jobs", "Search the job database. Use for any request to find, list or compare jobs.", {
        "role": {"type": "string", "description": "Job title or field, e.g. 'software engineer', 'marketing'"},
        "location": {"type": "string", "description": "City or 'remote', e.g. 'New York'"},
        "salary_min": {"type": "integer", "description": "Minimum yearly salary in US dollars, e.g. 120000"},
        "mode": {"type": "string", "enum": ["remote", "hybrid", "onsite"]}}),
    _fn("get_company", "Look up a company: industry, size, rating, open roles.", {"name": {"type": "string"}}, ["name"]),
    _fn("build_resume", "Save a copy of the user's latest resume tailored to a target role, using only facts already in it.", {
        "target_role": {"type": "string"},
        "summary": {"type": "string", "description": "A new 2-3 sentence professional summary written from the resume's existing facts only"}},
        ["target_role", "summary"]),
    _fn("apply_to_job", "Propose applying to jobs. This does NOT submit anything: the user confirms on screen first.", {
        "job_ids": {"type": "array", "items": {"type": "integer"}, "description": "Ids from search_jobs results"}}, ["job_ids"]),
]


def _int(v):
    try:
        s = str(v).strip().lower().replace(",", "").replace("$", "")
        return int(float(s[:-1]) * 1000) if s.endswith("k") else int(float(s))
    except ValueError:
        return None


def _text(v, n):
    return re.sub(r"\s+", " ", str(v or "")).strip()[:n]


@database_sync_to_async
def _search(client_id, a):
    items, stats = search_jobs(_text(a.get("role"), 100), _text(a.get("location"), 100), _text(a.get("mode"), 10).lower(),
                               _int(a.get("salary_min")), latest_resume_data(client_id), limit=MAX_JOBS)
    note = "search_jobs results: " + "; ".join(f"id={i['id']} {i['title']} at {i['company']}" for i in items) if items else ""
    return Outcome({"stats": stats, "jobs": items}, [("jobs", {"items": items, "stats": stats})], note)


@database_sync_to_async
def _company(a):
    name = _text(a.get("name"), 100)
    c = Company.objects.filter(name__icontains=name).first() if name else None
    if not c:
        return Outcome({"error": "No company with that name in the database."})
    data = {"name": c.name, "industry": c.industry, "size": c.size, "location": c.location,
            "rating": c.rating, "blurb": c.blurb, "openRoles": c.jobs.count()}
    return Outcome(data, [("company", data)], f"company shown: {c.name}")


@database_sync_to_async
def _build_resume(client_id, a):
    base = Resume.objects.filter(client_id=client_id).order_by("-updated_at").first()
    if not base:
        return Outcome({"error": "The user has no resume yet. Ask them to create one in the resume builder first."})
    role, summary = _text(a.get("target_role"), 80), _text(a.get("summary"), 600)
    if not role or not summary:
        return Outcome({"error": "target_role and summary are both required."})
    new = Resume.objects.create(client_id=client_id, title=f"Tailored: {role}"[:120], data={**base.data, "role": role, "summary": summary})
    card = {"id": new.id, "name": new.title, "role": role, "updated": ago(new.updated_at), "score": completeness(new.data)}
    return Outcome({"saved": card}, [("resume", [card])], f"resume saved: {new.title}")


@database_sync_to_async
def _propose(a):
    ids = [i for i in (_int(x) for x in (a.get("job_ids") or [])[:10]) if i]
    jobs = list(Job.objects.select_related("company").filter(id__in=ids))
    if not jobs:
        return Outcome({"error": "None of those job ids exist. Search for jobs first."})
    items = [job_json(j) for j in jobs]
    return Outcome({"status": "waiting_for_user_confirmation", "jobs": [f"{i['title']} at {i['company']}" for i in items],
                    "instruction": "Nothing has been sent. Ask the user to confirm on screen. Never say it was submitted."},
                   [("confirm_apply", {"jobs": items})], "proposed applying to: " + ", ".join(str(i["id"]) for i in items))


async def run_tool(name, args, client_id):
    args = args if isinstance(args, dict) else {}
    if name == "search_jobs": return await _search(client_id, args)
    if name == "get_company": return await _company(args)
    if name == "build_resume": return await _build_resume(client_id, args)
    if name == "apply_to_job": return await _propose(args)
    return Outcome({"error": f"Unknown tool '{name}'. Available: search_jobs, get_company, build_resume, apply_to_job."})


@database_sync_to_async
def apply_confirmed(client_id, job_ids):
    """Called only after the user taps Confirm. Records applications with their latest resume (real submission = B7)."""
    resume = Resume.objects.filter(client_id=client_id).order_by("-updated_at").first()
    made, skipped = [], 0
    for job in Job.objects.select_related("company").filter(id__in=job_ids[:10]):
        app, created = Application.objects.get_or_create(client_id=client_id, job=job, defaults={"resume": resume})
        if created:
            made.append({"id": app.id, "title": job.title, "company": job.company.name, "status": app.get_status_display(), "date": date_label(app.created_at)})
        else:
            skipped += 1
    return made, skipped
