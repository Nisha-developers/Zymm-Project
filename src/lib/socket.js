import { USE_MOCK, WS_URL, getClientId } from "./config";
import { MockSocket } from "./mockServer";

// Same interface as MockSocket: on(fn), connect(), send(x), close().
// JSON text frames = events. Binary frames in = TTS audio (emitted as audio.chunk). Binary frames out = mic PCM.
export class AssistantSocket {
  constructor(url) { this.url = url; this.handlers = new Set(); this.queue = []; this.retries = 0; }
  on(fn) { this.handlers.add(fn); return () => this.handlers.delete(fn); }
  emit(e) { this.handlers.forEach((h) => h(e)); }
  setStatus(status) { this.emit({ type: "connection", status }); }
  connect() {
    this.closing = false;
    this.setStatus("connecting");
    const ws = (this.ws = new WebSocket(`${this.url}?client=${getClientId()}`));
    ws.binaryType = "arraybuffer";
    ws.onopen = () => { this.retries = 0; this.setStatus("open"); this.queue.splice(0).forEach((m) => ws.send(m)); };
    ws.onmessage = (m) => {
      if (typeof m.data !== "string") return this.emit({ type: "audio.chunk", data: m.data });
      try { this.emit(JSON.parse(m.data)); } catch { /* ignore malformed frame */ }
    };
    ws.onclose = () => {
      this.setStatus("closed");
      if (this.closing) return;
      this.timer = setTimeout(() => this.connect(), Math.min(1000 * 2 ** this.retries++, 15000));
    };
    ws.onerror = () => ws.close();
  }
  send(x) {
    const m = x instanceof ArrayBuffer || ArrayBuffer.isView(x) ? x : JSON.stringify(x);
    if (this.ws?.readyState === 1) this.ws.send(m);
    else if (typeof m === "string") this.queue.push(m); // never queue audio: stale mic frames are useless
  }
  close() { this.closing = true; clearTimeout(this.timer); this.ws?.close(); }
}

export const createSocket = () => (USE_MOCK ? new MockSocket() : new AssistantSocket(WS_URL));
