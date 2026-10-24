import ResumeCard from "./ResumeCard";
import ApplicationCard from "./ApplicationCard";
import CompanyCard from "./CompanyCard";

// Renders structured tool.result payloads inside the conversation. "jobs" is already handled by AssistantResponse.
export default function ToolResults({ results = [] }) {
  const rest = results.filter((r) => r.type !== "jobs");
  if (!rest.length) return null;
  return (
    <div className="w-full space-y-3">
      {rest.map((r, i) => (
        <div key={i} className="space-y-3">
          {r.type === "resume" && r.data.map((x) => <ResumeCard key={x.id} resume={x} />)}
          {r.type === "applications" && r.data.map((x) => <ApplicationCard key={x.id} application={x} />)}
          {r.type === "company" && <CompanyCard company={r.data} />}
        </div>
      ))}
    </div>
  );
}
