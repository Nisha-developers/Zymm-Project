"""Qwen3-8B through Ollama's /api/chat (streaming NDJSON). Standard library only; the blocking read runs in a thread."""
import asyncio
import json
import os
import threading
import urllib.error
import urllib.request

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3:8b")
LLM_BACKEND = os.environ.get("LLM_BACKEND", "ollama")  # "stub" = canned sample reply, for working without Ollama
TIMEOUT = 120  # seconds to wait for the next chunk (the first request after idle loads the model, which is slow)
_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))  # never route localhost through a system proxy


class LlmError(Exception):
    """A problem the user should see (message is safe to show)."""


class ThinkFilter:
    """Removes <think>...</think> even when a tag is split across streamed chunks (safety net: we also send think=false)."""
    OPEN, CLOSE = "<think>", "</think>"

    def __init__(self):
        self.inside, self.buf = False, ""

    def feed(self, s):
        self.buf += s
        out = ""
        while True:
            if self.inside:
                i = self.buf.find(self.CLOSE)
                if i < 0:
                    self.buf = self.buf[-(len(self.CLOSE) - 1):]
                    return out
                self.buf, self.inside = self.buf[i + len(self.CLOSE):], False
            else:
                i = self.buf.find(self.OPEN)
                if i < 0:
                    keep = next((k for k in range(min(len(self.buf), len(self.OPEN) - 1), 0, -1) if self.OPEN.startswith(self.buf[-k:])), 0)
                    out += self.buf[: len(self.buf) - keep]
                    self.buf = self.buf[len(self.buf) - keep:]
                    return out
                out += self.buf[:i]
                self.buf, self.inside = self.buf[i + len(self.OPEN):], True

    def flush(self):
        out, self.buf = ("" if self.inside else self.buf), ""
        return out


def _read_stream(messages, tools, stop):
    payload = {"model": OLLAMA_MODEL, "messages": messages, "tools": tools, "stream": True, "think": False,
               "keep_alive": "30m", "options": {"temperature": 0.3}}
    req = urllib.request.Request(OLLAMA_URL.rstrip("/") + "/api/chat", data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    try:
        with _opener.open(req, timeout=TIMEOUT) as r:
            for raw in r:
                if stop.is_set():
                    return
                if not raw.strip():
                    continue
                obj = json.loads(raw)
                if obj.get("error"):
                    raise LlmError("The language model reported an error. Please try again.")
                msg = obj.get("message") or {}
                if msg.get("content"):
                    yield {"content": msg["content"]}
                calls = []
                for c in msg.get("tool_calls") or []:
                    fn = c.get("function") or {}
                    args = fn.get("arguments") or {}
                    if isinstance(args, str):
                        try: args = json.loads(args)
                        except ValueError: args = {}
                    calls.append({"name": fn.get("name", ""), "arguments": args if isinstance(args, dict) else {}})
                if calls:
                    yield {"tool_calls": calls}
                if obj.get("done"):
                    return
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise LlmError(f"The model {OLLAMA_MODEL} isn't installed. Run: ollama pull {OLLAMA_MODEL}") from e
        raise LlmError(f"The language model failed (server answered {e.code}).") from e
    except (urllib.error.URLError, OSError) as e:
        raise LlmError("Zymm's brain (Ollama) isn't running. Start Ollama and try again.") from e
    except ValueError as e:
        raise LlmError("The language model returned an unreadable answer.") from e


async def chat(messages, tools):
    """Async generator of {'content': str} and {'tool_calls': [{'name','arguments'}]} events."""
    loop, q, stop = asyncio.get_running_loop(), asyncio.Queue(), threading.Event()

    def put(x):
        try: loop.call_soon_threadsafe(q.put_nowait, x)
        except RuntimeError: stop.set()  # event loop already closed

    def worker():
        try:
            for item in _read_stream(messages, tools, stop):
                put(item)
            put(None)
        except Exception as e:  # LlmError or anything unexpected; surfaced in the consumer below
            put(e)

    loop.run_in_executor(None, worker)
    try:
        while (item := await q.get()) is not None:
            if isinstance(item, Exception):
                raise item if isinstance(item, LlmError) else LlmError("The language model failed unexpectedly.")
            yield item
    finally:
        stop.set()  # interrupt / disconnect stops reading, so Ollama stops generating


def list_models():
    """Names of locally installed models (used by `check_ollama`)."""
    try:
        with _opener.open(OLLAMA_URL.rstrip("/") + "/api/tags", timeout=5) as r:
            return [m.get("name", "") for m in json.loads(r.read()).get("models", [])]
    except (urllib.error.URLError, OSError, ValueError) as e:
        raise LlmError("Zymm's brain (Ollama) isn't running. Start Ollama and try again.") from e
