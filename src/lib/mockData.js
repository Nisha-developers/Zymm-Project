export const RESUMES = [
  { id: 1, name: "Frontend Engineer, NYC", role: "Frontend Engineer", updated: "2 days ago", score: 92 },
  { id: 2, name: "Full Stack General", role: "Full Stack Developer", updated: "1 week ago", score: 86 },
  { id: 3, name: "Startup CV (short)", role: "Software Engineer", updated: "3 weeks ago", score: 78 },
];
export const APPLICATIONS = [
  { id: 1, title: "Software Engineer", company: "Google", status: "Interview", date: "Oct 18" },
  { id: 2, title: "Full Stack Developer", company: "Stripe", status: "In review", date: "Oct 17" },
  { id: 3, title: "Frontend Engineer", company: "Datadog", status: "Submitted", date: "Oct 16" },
  { id: 4, title: "Web Developer", company: "Etsy", status: "Rejected", date: "Oct 10" },
];
export const COMPANY = {
  name: "Google", industry: "Technology", size: "10,000+ employees", location: "New York, NY",
  rating: 4.4, openRoles: 38, blurb: "Search, cloud and consumer products at global scale.",
};
export const CONVERSATIONS = [
  { id: 1, title: "Find software engineering jobs in New York", preview: "24 matches, 3 strong", time: "Today" },
  { id: 2, title: "Tailor my resume for a frontend role", preview: "Resume updated, score 92", time: "Yesterday" },
  { id: 3, title: "Email hiring managers at Stripe", preview: "Draft ready to review", time: "Mon" },
  { id: 4, title: "Prepare for a product design interview", preview: "5 practice questions", time: "Oct 12" },
];
export const JOB_EXTRA = {
  type: "Full-time · Hybrid",
  about: "Build and ship products used by millions. You will work with a small team on performance-critical interfaces and shared platform tooling.",
  requirements: ["3+ years with React and TypeScript", "Experience shipping production web apps", "Comfortable with REST and WebSocket APIs", "Strong eye for UI quality and accessibility"],
  whyMatch: ["Your React and Tailwind experience matches the core stack", "Your full-stack work covers the API side of the role", "Salary range is above your $120k minimum"],
};
export const ALL_TOPICS = [
  { group: "Find work", items: [
    { icon: "search", title: "Find jobs that fit", prompt: "Find me software engineering jobs in New York that pay at least $120k." },
    { icon: "spark", title: "Remote roles only", prompt: "Find remote frontend jobs that pay at least $110k." } ] },
  { group: "Resume", items: [
    { icon: "doc", title: "Build my resume", prompt: "Tailor my resume for a senior frontend role." },
    { icon: "spark", title: "Analyze my resume", prompt: "Analyze my resume and tell me what to improve." } ] },
  { group: "Apply", items: [
    { icon: "send", title: "Apply for me", prompt: "Apply to my top five matches." },
    { icon: "send", title: "Email hiring managers", prompt: "Email hiring managers at my top matches." } ] },
  { group: "Prepare", items: [
    { icon: "spark", title: "Prepare interviews", prompt: "Help me prepare for a product design interview." },
    { icon: "search", title: "Research a company", prompt: "Tell me about Google as an employer." } ] },
];