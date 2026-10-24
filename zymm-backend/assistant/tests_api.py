from django.core.management import call_command
from django.test import TestCase

from .models import Application, Job

A, B = {"HTTP_X_CLIENT_ID": "client-a"}, {"HTTP_X_CLIENT_ID": "client-b"}
RESUME = {"title": "My CV", "fullName": "Sam Lee", "email": "s@x.io", "phone": "1", "role": "Software Engineer",
          "summary": "Engineer with several years of experience building web products.",
          "experience": [{"id": 1, "role": "Dev", "company": "X", "dates": "", "bullets": "Built things"}],
          "education": [{"id": 1, "school": "U", "degree": "BSc", "dates": ""}], "skills": ["React", "Django", "SQL", "Tailwind", "Git"]}


class ApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_jobs", verbosity=0)

    def post(self, url, data, who=A):
        return self.client.post(url, data, content_type="application/json", **who)

    def test_search_filters_and_stats(self):
        r = self.client.get("/api/jobs/search", {"role": "software engineering", "location": "New York", "salary_min": 120000}).json()
        self.assertTrue(r["items"])
        self.assertTrue(all("New York" in Job.objects.get(id=i["id"]).location for i in r["items"]))
        self.assertEqual(r["stats"]["matches"], len(r["items"]))
        self.assertEqual(set(r["items"][0]), {"id", "title", "company", "location", "salary", "match"})

    def test_search_remote_and_marketing(self):
        self.assertTrue(all(i["location"] == "Remote" for i in self.client.get("/api/jobs/search", {"location": "remote"}).json()["items"]))
        titles = [i["title"] for i in self.client.get("/api/jobs/search", {"role": "marketing", "location": "New York"}).json()["items"]]
        self.assertTrue(any("Marketing" in t for t in titles))

    def test_bad_salary_and_missing_job(self):
        self.assertEqual(self.client.get("/api/jobs/search", {"salary_min": "abc"}).status_code, 400)
        self.assertEqual(self.client.get("/api/jobs/99999").status_code, 404)

    def test_job_detail_shape(self):
        d = self.client.get(f"/api/jobs/{Job.objects.first().id}").json()
        self.assertIn("requirements", d)
        self.assertIn("openRoles", d["company"])

    def test_client_header_required(self):
        for url in ("/api/resumes", "/api/applications", "/api/conversations"):
            self.assertEqual(self.client.get(url).status_code, 400)

    def test_resume_crud_and_score(self):
        created = self.post("/api/resumes", RESUME)
        self.assertEqual(created.status_code, 201)
        rid = created.json()["id"]
        listing = self.client.get("/api/resumes", **A).json()
        self.assertEqual(listing[0]["score"], 100)
        self.assertEqual(listing[0]["name"], "My CV")
        upd = self.client.put(f"/api/resumes/{rid}", {**RESUME, "title": "Renamed"}, content_type="application/json", **A)
        self.assertEqual(upd.json()["title"], "Renamed")

    def test_resumes_are_private_per_client(self):
        rid = self.post("/api/resumes", RESUME).json()["id"]
        self.assertEqual(self.client.get("/api/resumes", **B).json(), [])
        self.assertEqual(self.client.get(f"/api/resumes/{rid}", **B).status_code, 404)
        self.assertEqual(self.client.put(f"/api/resumes/{rid}", RESUME, content_type="application/json", **B).status_code, 404)

    def test_match_uses_resume_skills(self):
        self.post("/api/resumes", RESUME)
        items = self.client.get("/api/jobs/search", {"role": "engineer"}, **A).json()["items"]
        self.assertTrue(all(i["match"] and i["match"] >= 50 for i in items))

    def test_apply_flow(self):
        job = Job.objects.first()
        rid = self.post("/api/resumes", RESUME).json()["id"]
        ok = self.post("/api/applications", {"jobId": job.id, "resumeId": rid, "coverLetter": "Hi"})
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(ok.json()["status"], "Submitted")
        self.assertEqual(self.post("/api/applications", {"jobId": job.id}).status_code, 409)
        self.assertEqual(len(self.client.get("/api/applications", **A).json()), 1)
        self.assertEqual(self.client.get("/api/applications", **B).json(), [])
        self.assertEqual(Application.objects.count(), 1)

    def test_apply_rejects_bad_input(self):
        self.assertEqual(self.post("/api/applications", {"jobId": 99999}).status_code, 404)
        self.assertEqual(self.post("/api/applications", {"jobId": "x"}).status_code, 404)
        rid_b = self.post("/api/resumes", RESUME, B).json()["id"]
        self.assertEqual(self.post("/api/applications", {"jobId": Job.objects.first().id, "resumeId": rid_b}).status_code, 404)
        self.assertEqual(self.client.post("/api/resumes", "nope", content_type="application/json", **A).status_code, 400)

    def test_export_not_built_yet(self):
        rid = self.post("/api/resumes", RESUME).json()["id"]
        self.assertEqual(self.client.get(f"/api/resumes/{rid}/export", **A).status_code, 501)
