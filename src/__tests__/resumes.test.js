import { DEFAULT_RESUME, resumeToHtml } from "../lib/resumes";

describe("resumeToHtml", () => {
  it("escapes user-entered HTML so exports can't run scripts", () => {
    const html = resumeToHtml({ ...DEFAULT_RESUME, fullName: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
  it("includes every section", () => {
    const html = resumeToHtml(DEFAULT_RESUME);
    ["Summary", "Experience", "Education", "Skills"].forEach((h) => expect(html).toContain(h));
  });
});
