import { MockSocket } from "../lib/mockServer";

function play(text) {
  vi.useFakeTimers();
  const sock = new MockSocket(), events = [];
  sock.on((e) => events.push(e));
  sock.send({ type: "text.message", text });
  return { sock, events };
}
afterEach(() => vi.useRealTimers());

describe("MockSocket", () => {
  it("runs listening -> processing -> speaking -> idle with a jobs result and streamed text", () => {
    const { events } = play("find jobs");
    vi.advanceTimersByTime(30000);
    const states = events.filter((e) => e.type === "state").map((e) => e.state);
    expect(states).toEqual(["listening", "processing", "speaking", "idle"]);
    expect(events.some((e) => e.type === "tool.result" && e.kind === "jobs")).toBe(true);
    expect(events.filter((e) => e.type === "text.delta").length).toBeGreaterThan(3);
  });
  it("reports an error when asked to", () => {
    const { events } = play("trigger an error");
    vi.advanceTimersByTime(30000);
    expect(events.some((e) => e.type === "error")).toBe(true);
  });
  it("stops emitting after an interrupt", () => {
    const { sock, events } = play("find jobs");
    vi.advanceTimersByTime(500);
    sock.send({ type: "interrupt" });
    events.length = 0;
    vi.advanceTimersByTime(30000);
    expect(events).toEqual([]);
  });
});
