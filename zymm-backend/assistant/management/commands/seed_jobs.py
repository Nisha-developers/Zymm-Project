from django.core.management.base import BaseCommand
from assistant.models import Company, Job

COMPANIES = [  # fictional, so nobody mistakes sample data for real openings
    ("Northwind Labs", "Technology", "1,000–5,000 employees", "New York, NY", 4.4, "Developer tools and cloud software for growing teams."),
    ("Brightpath Media", "Marketing & Media", "200–1,000 employees", "New York, NY", 4.2, "A brand and growth agency for consumer companies."),
    ("Lumen Cloud", "Technology", "5,000+ employees", "Remote", 4.5, "Infrastructure and analytics platform used worldwide."),
    ("Harbor Pay", "Fintech", "500–1,000 employees", "New York, NY", 4.3, "Payments and invoicing for small businesses."),
    ("Pixelcraft Studio", "Design", "50–200 employees", "Brooklyn, NY", 4.6, "Product design studio for startups."),
]
ENG = ["3+ years with React or a similar framework", "Experience shipping production web apps", "Comfortable with REST and WebSocket APIs", "Strong eye for quality and accessibility"]
MKT = ["3+ years in digital or content marketing", "Data-driven campaign experience", "Excellent writing and communication", "Familiarity with analytics tools"]
DSN = ["Portfolio of shipped product work", "Fluent in Figma and design systems", "Experience running user research"]
# (company, title, location, mode, min, max, requirements)
JOBS = [
    ("Northwind Labs", "Software Engineer", "New York, NY", "hybrid", 140000, 180000, ENG),
    ("Northwind Labs", "Senior Frontend Engineer", "New York, NY", "hybrid", 150000, 190000, ENG),
    ("Northwind Labs", "Full Stack Developer", "New York, NY", "onsite", 125000, 165000, ENG),
    ("Lumen Cloud", "Software Engineer, Platform", "Remote", "remote", 135000, 175000, ENG),
    ("Lumen Cloud", "Frontend Engineer", "Remote", "remote", 120000, 160000, ENG),
    ("Lumen Cloud", "Backend Engineer (Django)", "Remote", "remote", 125000, 165000, ENG),
    ("Harbor Pay", "Software Engineer", "New York, NY", "onsite", 130000, 170000, ENG),
    ("Harbor Pay", "Product Marketing Manager", "New York, NY", "hybrid", 110000, 145000, MKT),
    ("Brightpath Media", "Marketing Manager", "New York, NY", "hybrid", 95000, 130000, MKT),
    ("Brightpath Media", "Content Marketing Lead", "New York, NY", "onsite", 90000, 125000, MKT),
    ("Brightpath Media", "Growth Marketing Specialist", "New York, NY", "hybrid", 80000, 110000, MKT),
    ("Pixelcraft Studio", "Product Designer", "Brooklyn, NY", "hybrid", 105000, 140000, DSN),
    ("Pixelcraft Studio", "UX Researcher", "Brooklyn, NY", "onsite", 95000, 130000, DSN),
    ("Pixelcraft Studio", "Marketing Designer", "New York, NY", "hybrid", 85000, 115000, DSN),
]


class Command(BaseCommand):
    help = "Load sample companies and jobs (safe to run repeatedly)."

    def handle(self, *args, **opts):
        cos = {}
        for name, industry, size, loc, rating, blurb in COMPANIES:
            cos[name], _ = Company.objects.get_or_create(name=name, defaults=dict(industry=industry, size=size, location=loc, rating=rating, blurb=blurb))
        made = 0
        for co, title, loc, mode, lo, hi, reqs in JOBS:
            about = f"Sample listing. {co} is hiring a {title}. You will work with a small team to ship work that customers use every day."
            _, new = Job.objects.get_or_create(company=cos[co], title=title, defaults=dict(location=loc, work_mode=mode, salary_min=lo, salary_max=hi, about=about, requirements=reqs))
            made += new
        self.stdout.write(f"Seeded {made} new jobs ({Job.objects.count()} total).")
