"""Job search shared by the REST endpoint and the Qwen3 tool, so both always agree."""
import re
from django.db.models import Q
from .models import Job, Resume
from .services import match_score, salary_label


def latest_resume_data(client_id):
    r = Resume.objects.filter(client_id=client_id).order_by("-updated_at").first() if client_id else None
    return r.data if r else None


def job_json(job, resume_data=None, query=""):
    return {"id": job.id, "title": job.title, "company": job.company.name, "location": job.location,
            "salary": salary_label(job.salary_min, job.salary_max), "match": match_score(job, resume_data, query)}


def search_jobs(role="", location="", mode="", salary_min=None, resume_data=None, limit=20):
    qs = Job.objects.select_related("company")
    for word in re.findall(r"[A-Za-z0-9+#]+", role):
        if len(word) >= 3:  # crude stemming ("engineering" -> "engineer")
            stem = word[: max(4, len(word) - 3)]
            qs = qs.filter(Q(title__icontains=stem) | Q(about__icontains=stem) | Q(company__name__icontains=stem))
    if location.lower() == "remote":
        mode = "remote"
    elif location:
        qs = qs.filter(location__icontains=location)
    if mode in dict(Job.Mode.choices):
        qs = qs.filter(work_mode=mode)
    if salary_min:
        qs = qs.filter(salary_max__gte=salary_min)

    jobs = list(qs[:200])
    items = [job_json(j, resume_data, role) for j in jobs]
    items.sort(key=lambda i: -(i["match"] or 0))
    lo = min((j.salary_min for j in jobs if j.salary_min), default=None)
    hi = max((j.salary_max for j in jobs if j.salary_max), default=None)
    stats = {"matches": len(jobs), "remote": sum(j.work_mode == "remote" for j in jobs),
             "hybrid": sum(j.work_mode == "hybrid" for j in jobs), "range": salary_label(lo, hi)}
    return items[:limit], stats
