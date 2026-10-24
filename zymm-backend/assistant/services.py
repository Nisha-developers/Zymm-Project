"""Formatting and scoring helpers. Output shapes match what the React screens already render."""
import re
from django.utils import timezone
from django.utils.timesince import timesince

WORD = re.compile(r"[a-z0-9+#]{2,}")


def salary_label(lo, hi):
    k = lambda n: f"${round(n / 1000)}k"
    if lo and hi:
        return f"{k(lo)}–{k(hi)}"
    return f"{k(lo or hi)}+" if (lo or hi) else "Not listed"


def ago(dt):
    if (timezone.now() - dt).total_seconds() < 60:
        return "just now"
    return timesince(dt).split(",")[0].replace("\xa0", " ") + " ago"


def date_label(dt):
    d = timezone.localtime(dt)
    return f"{d:%b} {d.day}"


def day_label(dt):
    d = timezone.localtime(dt).date()
    n = (timezone.localdate() - d).days
    if n == 0: return "Today"
    if n == 1: return "Yesterday"
    return f"{d:%a}" if n < 7 else f"{d:%b} {d.day}"


def completeness(data):
    """Resume strength 0-100: how complete the resume is (not how well it fits a job)."""
    d, s = data or {}, 0
    s += 20 if all(d.get(k) for k in ("fullName", "email", "phone")) else 0
    s += 20 if len(d.get("summary", "")) >= 40 else 0
    s += 25 if any(e.get("bullets", "").strip() for e in d.get("experience", [])) else 0
    s += 15 if d.get("education") else 0
    s += 20 if len(d.get("skills", [])) >= 5 else 0
    return s


def match_score(job, resume_data, query=""):
    """PLACEHOLDER keyword overlap (50-99) between the job and the user's resume/query. None = nothing to compare.
    B4 replaces this with Qwen3-based scoring."""
    terms = set(WORD.findall(query.lower()))
    if resume_data:
        terms |= set(WORD.findall(resume_data.get("role", "").lower()))
        for skill in resume_data.get("skills", []):
            terms |= set(WORD.findall(str(skill).lower()))
    if not terms:
        return None
    text = set(WORD.findall(f"{job.title} {job.about} {' '.join(job.requirements)}".lower()))
    hit = sum(1 for t in terms if any(t[:5] == w[:5] for w in text))
    return min(99, round(50 + 50 * hit / len(terms)))
