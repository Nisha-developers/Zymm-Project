"""The thinking loop: user text -> Qwen3 -> (tool calls -> results -> Qwen3)* -> streamed reply."""
import json
from dataclasses import dataclass, field

from . import llm, store, tools

MAX_STEPS = 3        # model <-> tool round trips per turn
HISTORY_LIMIT = 12   # earlier messages sent back to the model

SYSTEM_PROMPT = """You are Zymm, a friendly, sharp headhunter and job recruiter. You help the user find jobs, tailor their resume and apply.
Your replies are spoken aloud: use short plain sentences, no markdown, no lists, no emoji, say numbers naturally.
Rules:
- For anything about jobs or companies, call a tool. Never invent jobs, companies, salaries or resume details.
- After search_jobs, say how many matched, mention the best two or three by title and company, and ask what to do next.
- If a search finds nothing, say so and suggest widening the role, location or salary.
- Never claim you applied. apply_to_job only proposes: tell the user to confirm on screen.
- build_resume may only rephrase facts already in the user's resume. If they have no resume, say to create one first.
- If the request is unrelated to careers, answer briefly and steer back."""


@dataclass
class Session:
    client_id: str
    history: list = field(default_factory=list)
    conversation_id: int | None = None


async def run(emit, text, session):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, *session.history[-HISTORY_LIMIT:], {"role": "user", "content": text}]
    reply, ui, notes, speaking = "", [], [], False

    async def say(piece):
        nonlocal reply, speaking
        if not reply:
            piece = piece.lstrip()
        if not piece:
            return
        if not speaking:
            speaking = True
            await emit({"type": "state", "state": "speaking"})
        reply += piece
        await emit({"type": "text.delta", "delta": piece})

    for _ in range(MAX_STEPS):
        calls, content, think = [], "", llm.ThinkFilter()
        async for ev in llm.chat(messages, tools.SCHEMAS):
            if "tool_calls" in ev:
                calls += ev["tool_calls"]
            else:
                piece = think.feed(ev["content"])
                content += piece
                await say(piece)
        tail = think.flush()
        content += tail
        await say(tail)
        if not calls:
            break
        messages.append({"role": "assistant", "content": content,
                         "tool_calls": [{"function": {"name": c["name"], "arguments": c["arguments"]}} for c in calls]})
        for c in calls:
            out = await tools.run_tool(c["name"], c["arguments"], session.client_id)
            for kind, data in out.ui:
                ui.append({"kind": kind, "data": data})
                await emit({"type": "tool.result", "kind": kind, "data": data})
            if out.note:
                notes.append(out.note)
            messages.append({"role": "tool", "tool_name": c["name"], "content": json.dumps(out.model)[:4000]})

    if not reply:
        await say("I found some information but couldn't put it into words. Could you ask me again?")

    keep = reply + (f"\n(context: {' | '.join(notes)})" if notes else "")  # lets "apply to the first one" work next turn
    session.history += [{"role": "user", "content": text}, {"role": "assistant", "content": keep[:1500]}]
    session.conversation_id = await store.save_turn(session.client_id, session.conversation_id, text, reply, ui)
    await emit({"type": "state", "state": "idle"})
