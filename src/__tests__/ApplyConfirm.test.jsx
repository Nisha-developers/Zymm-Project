import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ApplyConfirm from "../components/screens/ApplyConfirm";

const job = { id: 1, title: "Software Engineer", company: "Google", location: "New York, NY", salary: "$140k–$180k", match: 94 };

describe("ApplyConfirm", () => {
  it("cannot submit until the user confirms, then shows success", async () => {
    render(<ApplyConfirm job={job} />);
    const submit = screen.getByRole("button", { name: /submit application/i });
    expect(submit.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /reviewed the resume/i }));
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => screen.getByText(/application submitted/i), { timeout: 3000 });
  });
});
