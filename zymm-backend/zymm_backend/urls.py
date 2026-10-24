from django.urls import path
from assistant import views as v

urlpatterns = [
    path("api/health", v.health),
    path("api/jobs/search", v.jobs_search),
    path("api/jobs/<int:job_id>", v.job_detail),
    path("api/resumes", v.resumes),
    path("api/resumes/<int:rid>", v.resume_detail),
    path("api/resumes/<int:rid>/export", v.resume_export),
    path("api/applications", v.applications),
    path("api/conversations", v.conversations),
]
