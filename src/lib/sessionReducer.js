export const init = { state: "idle", transcript: "", reply: "", results: [], error: null, connection: "closed" };

export function reducer(s, e) {
  switch (e.type) {
    case "reset": return { ...init, connection: s.connection, state: e.state || "idle" };
    case "connection": return { ...s, connection: e.status };
    case "state": return { ...s, state: e.state };
    case "transcript.partial":
    case "transcript.final": return { ...s, transcript: e.text };
    case "text.delta": return { ...s, reply: s.reply + e.delta };
    case "tool.result": return { ...s, results: [...s.results, { type: e.kind, data: e.data }] };
    case "error": return { ...s, state: "error", error: e.message || "Something went wrong" };
    default: return s;
  }
}

