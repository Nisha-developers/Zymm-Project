import { init, reducer } from "../lib/sessionReducer";
const run = (events) => events.reduce(reducer, init);

describe("sessionReducer", () => {
  it("accumulates streamed text and keeps the latest transcript", () => {
    const s = run([{ type: "transcript.partial", text: "find" }, { type: "transcript.final", text: "find jobs" },
      { type: "text.delta", delta: "I found" }, { type: "text.delta", delta: " 12 jobs" }]);
    expect(s.transcript).toBe("find jobs");
    expect(s.reply).toBe("I found 12 jobs");
  });
  it("lets the backend drive the state and collects tool results", () => {
    const s = run([{ type: "state", state: "speaking" }, { type: "tool.result", kind: "jobs", data: { items: [] } }]);
    expect(s.state).toBe("speaking");
    expect(s.results).toEqual([{ type: "jobs", data: { items: [] } }]);
  });
  it("enters the error state with a message, and reset clears it", () => {
    const failed = run([{ type: "error", message: "boom" }]);
    expect(failed.state).toBe("error");
    expect(failed.error).toBe("boom");
    const again = reducer(failed, { type: "reset", state: "listening" });
    expect(again.state).toBe("listening");
    expect(again.error).toBeNull();
  });
});
