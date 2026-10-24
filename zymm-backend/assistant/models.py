from django.db import models


class Company(models.Model):
    name = models.CharField(max_length=120, unique=True)
    industry = models.CharField(max_length=80, blank=True)
    size = models.CharField(max_length=40, blank=True)
    location = models.CharField(max_length=120, blank=True)
    rating = models.FloatField(default=0)
    blurb = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Job(models.Model):
    class Mode(models.TextChoices):
        ONSITE = "onsite", "On-site"
        HYBRID = "hybrid", "Hybrid"
        REMOTE = "remote", "Remote"

    company = models.ForeignKey(Company, related_name="jobs", on_delete=models.CASCADE)
    title = models.CharField(max_length=160)
    location = models.CharField(max_length=120)
    work_mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.ONSITE)
    job_type = models.CharField(max_length=40, default="Full-time")
    salary_min = models.PositiveIntegerField(null=True, blank=True)
    salary_max = models.PositiveIntegerField(null=True, blank=True)
    about = models.TextField(blank=True)
    requirements = models.JSONField(default=list, blank=True)
    apply_url = models.URLField(blank=True)
    posted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-posted_at", "-id"]
        constraints = [models.UniqueConstraint(fields=["company", "title"], name="uniq_company_title")]

    def __str__(self):
        return f"{self.title} @ {self.company}"


# No login: every user-owned row is scoped by the anonymous id the browser sends in X-Client-Id.
class Resume(models.Model):
    client_id = models.CharField(max_length=64, db_index=True)
    title = models.CharField(max_length=120)
    data = models.JSONField(default=dict)  # fullName, role, summary, experience[], education[], skills[]
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Application(models.Model):
    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        IN_REVIEW = "in_review", "In review"
        INTERVIEW = "interview", "Interview"
        REJECTED = "rejected", "Rejected"

    client_id = models.CharField(max_length=64, db_index=True)
    job = models.ForeignKey(Job, on_delete=models.CASCADE)
    resume = models.ForeignKey(Resume, null=True, blank=True, on_delete=models.SET_NULL)
    cover_letter = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.SUBMITTED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["client_id", "job"], name="uniq_client_job")]


class Conversation(models.Model):
    client_id = models.CharField(max_length=64, db_index=True)
    title = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, related_name="messages", on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=[("user", "user"), ("assistant", "assistant")])
    text = models.TextField(blank=True)
    tool_result = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
