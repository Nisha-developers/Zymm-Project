"""One conversation turn: transcribe (B3, whisper.cpp) -> think (B4, Qwen3 via Ollama) -> speak (B5, Kokoro: coming)."""
import asyncio
import logging
import time

from . import agent, llm, stt, tools

log = logging.getLogger(__name__)
WORD_DELAY = 0.12  # seconds between words in the stub reply (tests set this to 0)

STUB_JOBS = [
    {"id": 1, "title": "Software Engineer", "company": "Google", "location": "New York, NY", "salary": "$140k–$180k", "match": 94},
    {"id": 2, "title": "Full Stack Developer", "company": "Stripe", "location": "New York, NY", "salary": "$130k–$170k", "match": 91},
]


async def _stub_reply(emit):  # LLM_BACKEND=stub: lets the app run without Ollama
    data = {"items": STUB_JOBS, "stats": {"matches": 2, "remote": 0, "hybrid": 0, "range": "$130k–$180k"}}
    await emit({"type": "state", "state": "speaking"})
    await emit({"type": "tool.result", "kind": "jobs", "data": data})
    for i, word in enumerate("This is a sample reply because the language model is switched off.".split(" ")):
        await emit({"type": "text.delta", "delta": (" " if i else "") + word})
        await asyncio.sleep(WORD_DELAY)
    await emit({"type": "state", "state": "idle"})


async def run_turn(emit, text, audio, session):
    if text is None and not audio:
        return await emit({"type": "error", "message": "I didn't hear anything. Please try again."})
    await emit({"type": "state", "state": "processing"})
    if text is None:
        started = time.monotonic()
        try:
            text = await stt.transcribe(audio)
            log.info("final transcript: %.1fs of audio took %.2fs -> %r", len(audio) / 32000, time.monotonic() - started, text)
        except stt.SttError as e:
            return await emit({"type": "error", "message": str(e)})
        if not text:
            return await emit({"type": "error", "message": "I didn't catch that. Please try again."})
    await emit({"type": "transcript.final", "text": text})
    if llm.LLM_BACKEND == "stub":
        return await _stub_reply(emit)
    try:
        await agent.run(emit, text, session)
    except llm.LlmError as e:
        await emit({"type": "error", "message": str(e)})


async def run_apply(emit, job_ids, session):
    """The user tapped Confirm. Only here do applications get recorded."""
    await emit({"type": "state", "state": "processing"})
    made, skipped = await tools.apply_confirmed(session.client_id, job_ids)
    if made:
        await emit({"type": "tool.result", "kind": "applications", "data": made})
    msg = (f"Done. I added {len(made)} application{'s' if len(made) != 1 else ''} to your list." if made
           else "You've already applied to those jobs." if skipped else "I couldn't find those jobs.")
    await emit({"type": "state", "state": "speaking"})
    await emit({"type": "text.delta", "delta": msg})
    await emit({"type": "state", "state": "idle"})
