import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest import mock

from channels.db import database_sync_to_async as db
from channels.testing import WebsocketCommunicator
from django.core.management import call_command
from django.test import SimpleTestCase, TransactionTestCase

from . import agent, llm, tools
from .consumers import AssistantConsumer
from .models import Application, Conversation, Job, Message, Resume


class FakeOllama(BaseHTTPRequestHandler):
    """Streams scripted NDJSON like Ollama's /api/chat. Each request consumes the next script."""
    scripts, requests, status = [], [], 200

    def do_POST(self):
        FakeOllama.requests.append(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
        if FakeOllama.status != 200:
            self.send_response(FakeOllama.status); self.end_headers(); self.wfile.write(b'{"error":"model not found"}'); return
        self.send_response(200); self.send_header("Content-Type", "application/x-ndjson"); self.end_headers()
        for c in FakeOllama.scripts.pop(0):
            self.wfile.write((json.dumps(c) + "\n").encode())
        self.wfile.write(b'{"done": true}\n')

    def log_message(self, *a):
        pass


say = lambda *toks: [{"message": {"role": "assistant", "content": t}, "done": False} for t in toks]
call = lambda tool, **args: [{"message": {"role": "assistant", "content": "", "tool_calls": [{"function": {"name": tool, "arguments": args}}]}, "done": False}]


class AgentBase(TransactionTestCase):
    def setUp(self):
        call_command("seed_jobs", verbosity=0)
        FakeOllama.scripts, FakeOllama.requests, FakeOllama.status = [], [], 200
        self.srv = ThreadingHTTPServer(("127.0.0.1", 0), FakeOllama)
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        p = mock.patch.object(llm, "OLLAMA_URL", f"http://127.0.0.1:{self.srv.server_port}")
        p.start(); self.addCleanup(p.stop); self.addCleanup(self.srv.shutdown)
        self.events, self.session = [], agent.Session("tester")

    async def emit(self, e):
        self.events.append(e)

    async def run_agent(self, text="find jobs"):
        await agent.run(self.emit, text, self.session)

    def reply(self):
        return "".join(e["delta"] for e in self.events if e["type"] == "text.delta")

    def results(self, kind):
        return [e["data"] for e in self.events if e["type"] == "tool.result" and e["kind"] == kind]


class AgentTests(AgentBase):
    async def test_search_then_spoken_answer(self):
        FakeOllama.scripts = [call("search_jobs", role="software engineering", location="New York", salary_min="120000"), say("I found ", "five roles.")]
        await self.run_agent("find software jobs in New York over 120k")
        jobs = self.results("jobs")[0]
        self.assertTrue(0 < len(jobs["items"]) <= 5)
        self.assertEqual(self.reply(), "I found five roles.")
        order = [e.get("kind") or e.get("state") for e in self.events if e["type"] in ("tool.result", "state")]
        self.assertEqual(order, ["jobs", "speaking", "idle"])
        second = FakeOllama.requests[1]["messages"][-1]
        self.assertEqual((second["role"], second["tool_name"]), ("tool", "search_jobs"))
        self.assertEqual(FakeOllama.requests[0]["think"], False)
        self.assertEqual(await db(Message.objects.count)(), 2)
        self.assertIn("search_jobs results", self.session.history[-1]["content"])

    async def test_follow_up_turn_gets_history(self):
        FakeOllama.scripts = [say("Hello."), say("Again.")]
        await self.run_agent("hi"); await self.run_agent("and now?")
        sent = [m["content"] for m in FakeOllama.requests[1]["messages"] if m["role"] == "user"]
        self.assertEqual(sent, ["hi", "and now?"])
        self.assertEqual(await db(Conversation.objects.count)(), 1)  # same conversation continues

    async def test_think_tags_never_reach_the_user(self):
        FakeOllama.scripts = [say("<thi", "nk>secret plan</think>", "Hello there.")]
        await self.run_agent("hi")
        self.assertEqual(self.reply(), "Hello there.")

    async def test_unknown_tool_is_handled(self):
        FakeOllama.scripts = [call("delete_everything"), say("Sorry.")]
        await self.run_agent()
        self.assertIn("Unknown tool", FakeOllama.requests[1]["messages"][-1]["content"])
        self.assertEqual(self.reply(), "Sorry.")

    async def test_apply_only_proposes_never_applies(self):
        jid = (await db(Job.objects.first)()).id
        FakeOllama.scripts = [call("apply_to_job", job_ids=[jid]), say("Please confirm on screen.")]
        await self.run_agent("apply to the first one")
        self.assertEqual(len(self.results("confirm_apply")[0]["jobs"]), 1)
        self.assertEqual(await db(Application.objects.count)(), 0)

    async def test_build_resume_needs_a_resume_then_saves_a_copy(self):
        FakeOllama.scripts = [call("build_resume", target_role="Marketing", summary="x"), say("Create one first.")]
        await self.run_agent()
        self.assertIn("no resume", FakeOllama.requests[1]["messages"][-1]["content"])
        await db(Resume.objects.create)(client_id="tester", title="CV", data={"role": "Dev", "summary": "old", "skills": ["SQL"]})
        FakeOllama.scripts = [call("build_resume", target_role="Marketing", summary="New summary"), say("Saved.")]
        await self.run_agent()
        new = await db(Resume.objects.latest)("id")
        self.assertEqual((new.title, new.data["summary"], new.data["skills"]), ("Tailored: Marketing", "New summary", ["SQL"]))
        self.assertEqual(self.results("resume")[0][0]["name"], "Tailored: Marketing")

    async def test_get_company(self):
        FakeOllama.scripts = [call("get_company", name="northwind"), say("ok"), call("get_company", name="nope"), say("none")]
        await self.run_agent(); await self.run_agent()
        self.assertEqual(self.results("company")[0]["name"], "Northwind Labs")
        self.assertIn("No company", FakeOllama.requests[3]["messages"][-1]["content"])

    async def test_runaway_tool_loop_stops(self):
        FakeOllama.scripts = [call("search_jobs", role="x")] * 3
        await self.run_agent()
        self.assertEqual(len(FakeOllama.requests), agent.MAX_STEPS)
        self.assertIn("ask me again", self.reply())

    async def test_ollama_not_running(self):
        self.srv.shutdown(); self.srv.server_close()
        with self.assertRaisesRegex(llm.LlmError, "Ollama"):
            await self.run_agent()

    async def test_model_not_installed(self):
        FakeOllama.status = 404
        with self.assertRaisesRegex(llm.LlmError, "ollama pull"):
            await self.run_agent()


class ConfirmApplyTests(AgentBase):
    async def test_confirm_records_applications_for_that_client_only(self):
        jid = (await db(Job.objects.first)()).id
        comm = WebsocketCommunicator(AssistantConsumer.as_asgi(), "/ws/assistant/?client=tester")
        await comm.connect()
        for expect in ("Done. I added 1 application", "already applied"):
            await comm.send_json_to({"type": "apply.confirm", "jobIds": [jid]})
            events = []
            while not events or events[-1] != {"type": "state", "state": "idle"}:
                events.append(await comm.receive_json_from(timeout=5))
            self.assertIn(expect, "".join(e.get("delta", "") for e in events))
        self.assertEqual(await db(Application.objects.filter(client_id="tester").count)(), 1)
        await comm.disconnect()


class HelperTests(SimpleTestCase):
    def test_salary_coercion(self):
        self.assertEqual([tools._int(x) for x in ("$120k", "120,000", 90000, "abc")], [120000, 120000, 90000, None])

    def test_think_filter_across_chunks(self):
        f, out = llm.ThinkFilter(), ""
        for c in ("Hi <th", "ink>a</th", "ink> there <", "b>"):
            out += f.feed(c)
        self.assertEqual(out + f.flush(), "Hi  there <b>")
