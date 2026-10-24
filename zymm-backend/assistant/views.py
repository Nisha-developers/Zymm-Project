import json
from functools import wraps

from django.db import IntegrityError
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_http_methods

from .models import Application, Conversation, Job, Resume
from .search import job_json, latest_resume_data, search_jobs
from .services import ago, completeness, date_label, day_label, salary_label

MAX_BODY = 100_000


def err(message, status=400):
    return JsonResponse({"error": message}, status=status)


def health(request):
    return JsonResponse({"status": "ok"})


def client_of(request):
    return request.headers.get("X-Client-Id", "").strip()[:64]


def needs_client(fn):
    """Requiring the custom header also forces a CORS preflight, so other websites can't post on a user's behalf."""
    @wraps(fn)
    def wrapper(request, *a, **k):
        request.client_id = client_of(request)
        if not request.client_id:
            return err("Missing X-Client-Id header.")
        return fn(request, *a, **k)
    return wrapper


def body_of(request):
    if len(request.body) > MAX_BODY:
        return None
    try:
        data = json.loads(request.body or b"{}")
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


# ---- jobs (public; match score uses the caller's latest resume if they send X-Client-Id) ----
@require_GET
def jobs_search(request):
    salary = None
    if request.GET.get("salary_min"):
        try:
            salary = int(request.GET["salary_min"])
        except ValueError:
            return err("salary_min must be a number.")
    items, stats = search_jobs(request.GET.get("role", "").strip(), request.GET.get("location", "").strip(),
                               request.GET.get("mode", "").strip(), salary, latest_resume_data(client_of(request)), limit=20)
    return JsonResponse({"items": items, "stats": stats})


@require_GET
def job_detail(request, job_id):
    job = Job.objects.select_related("company").filter(id=job_id).first()
    if not job:
        return err("Job not found.", 404)
    c = job.company
    data = job_json(job, latest_resume_data(client_of(request)))
    data.update({"type": f"{job.job_type} · {job.get_work_mode_display()}", "about": job.about, "requirements": job.requirements,
                 "company": {"name": c.name, "industry": c.industry, "size": c.size, "location": c.location,
                             "rating": c.rating, "blurb": c.blurb, "openRoles": c.jobs.count()}})
    return JsonResponse(data)


# ---- resumes ----
def resume_summary(r):
    return {"id": r.id, "name": r.title, "role": r.data.get("role", ""), "updated": ago(r.updated_at), "score": completeness(r.data)}


def resume_full(r):
    return {**r.data, "id": r.id, "title": r.title}


def save_resume(resume, payload):
    title = str(payload.get("title", "")).strip()[:120]
    if not title:
        return err("title is required.")
    resume.title = title
    resume.data = {k: v for k, v in payload.items() if k not in ("id", "title")}
    resume.save()
    return None


@needs_client
@require_http_methods(["GET", "POST"])
def resumes(request):
    if request.method == "GET":
        return JsonResponse([resume_summary(r) for r in Resume.objects.filter(client_id=request.client_id)], safe=False)
    payload = body_of(request)
    if payload is None:
        return err("Invalid JSON body.")
    resume = Resume(client_id=request.client_id)
    problem = save_resume(resume, payload)
    return problem or JsonResponse(resume_full(resume), status=201)


@needs_client
@require_http_methods(["GET", "PUT"])
def resume_detail(request, rid):
    resume = Resume.objects.filter(id=rid, client_id=request.client_id).first()
    if not resume:
        return err("Resume not found.", 404)
    if request.method == "PUT":
        payload = body_of(request)
        if payload is None:
            return err("Invalid JSON body.")
        problem = save_resume(resume, payload)
        if problem:
            return problem
    return JsonResponse(resume_full(resume))


@needs_client
@require_GET
def resume_export(request, rid):
    if not Resume.objects.filter(id=rid, client_id=request.client_id).exists():
        return err("Resume not found.", 404)
    return err("PDF/DOCX export arrives in B9.", 501)


# ---- applications ----
def application_json(a):
    return {"id": a.id, "title": a.job.title, "company": a.job.company.name,
            "status": a.get_status_display(), "date": date_label(a.created_at)}


@needs_client
@require_http_methods(["GET", "POST"])
def applications(request):
    if request.method == "GET":
        qs = Application.objects.filter(client_id=request.client_id).select_related("job__company")
        return JsonResponse([application_json(a) for a in qs], safe=False)
    payload = body_of(request)
    if payload is None:
        return err("Invalid JSON body.")
    job = Job.objects.select_related("company").filter(id=payload.get("jobId")).first() if isinstance(payload.get("jobId"), int) else None
    if not job:
        return err("Job not found.", 404)
    resume = None
    if payload.get("resumeId") is not None:
        resume = Resume.objects.filter(id=payload["resumeId"], client_id=request.client_id).first()
        if not resume:
            return err("Resume not found.", 404)
    letter = payload.get("coverLetter") or ""
    if not isinstance(letter, str) or len(letter) > 5000:
        return err("coverLetter must be text under 5000 characters.")
    try:
        app, created = Application.objects.get_or_create(
            client_id=request.client_id, job=job, defaults={"resume": resume, "cover_letter": letter})
    except IntegrityError:
        created = False
    if not created:
        return err("You already applied to this job.", 409)
    return JsonResponse(application_json(app), status=201)


# ---- conversations ----
@needs_client
@require_GET
def conversations(request):
    out = []
    for c in Conversation.objects.filter(client_id=request.client_id).prefetch_related("messages")[:50]:
        last = next((m for m in reversed(list(c.messages.all())) if m.role == "assistant"), None)
        out.append({"id": c.id, "title": c.title, "preview": (last.text[:80] if last else ""), "time": day_label(c.updated_at)})
    return JsonResponse(out, safe=False)
