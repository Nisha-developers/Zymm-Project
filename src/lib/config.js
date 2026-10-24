export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/assistant/";
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// No login: an anonymous id per browser, sent with every request so the backend can scope resumes/applications/history.
export function getClientId() {
  try {
    let id = localStorage.getItem("zymm_client_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("zymm_client_id", id); }
    return id;
  } catch { return "anonymous"; }
}
