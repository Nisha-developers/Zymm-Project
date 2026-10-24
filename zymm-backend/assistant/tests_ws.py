from unittest import IsolatedAsyncioTestCase, mock

from channels.testing import WebsocketCommunicator

from . import llm, pipeline, stt
from .consumers import AssistantConsumer

IDLE = {"type": "state", "state": "idle"}


async def connect():
    comm = WebsocketCommunicator(AssistantConsumer.as_asgi(), "/ws/assistant/?client=test")
    ok, _ = await comm.connect()
    assert ok
    return comm


async def collect_until(comm, stop):
    events = []
    while True:
        ev = await comm.receive_json_from(timeout=5)
        events.append(ev)
        if stop(ev):
            return events


collect_until_idle = lambda comm: collect_until(comm, lambda e: e == IDLE)


class AssistantSocketTests(IsolatedAsyncioTestCase):
    def setUp(self):
        self.fake = mock.AsyncMock(return_value="find marketing jobs")
        for p in (mock.patch.object(pipeline, "WORD_DELAY", 0), mock.patch.object(stt, "transcribe", self.fake),
                  mock.patch.object(llm, "LLM_BACKEND", "stub")):
            p.start(); self.addCleanup(p.stop)

    async def test_text_turn_follows_contract(self):
        comm = await connect()
        await comm.send_json_to({"type": "text.message", "text": "find jobs"})
        events = await collect_until_idle(comm)
        self.assertEqual([e["state"] for e in events if e["type"] == "state"], ["processing", "speaking", "idle"])
        self.assertTrue(any(e["type"] == "tool.result" and e["kind"] == "jobs" for e in events))
        self.assertIn({"type": "transcript.final", "text": "find jobs"}, events)
        self.fake.assert_not_called()  # typed text never touches whisper
        await comm.disconnect()

    async def test_voice_turn_transcribes_buffered_audio(self):
        comm = await connect()
        await comm.send_json_to({"type": "audio.start"})
        self.assertEqual(await comm.receive_json_from(), {"type": "state", "state": "listening"})
        await comm.send_to(bytes_data=b"\x00\x01" * 1600)
        await comm.send_json_to({"type": "audio.end"})
        events = await collect_until_idle(comm)
        self.assertIn({"type": "transcript.final", "text": "find marketing jobs"}, events)
        self.assertEqual(len(self.fake.call_args.args[0]), 3200)
        await comm.disconnect()

    async def test_live_partial_transcript_while_listening(self):
        comm = await connect()
        await comm.send_json_to({"type": "audio.start"})
        await comm.receive_json_from()
        await comm.send_to(bytes_data=b"\x00\x01" * 12000)  # 0.75 s, past the 0.6 s threshold
        self.assertEqual(await comm.receive_json_from(timeout=5), {"type": "transcript.partial", "text": "find marketing jobs"})
        await comm.disconnect()

    async def test_audio_outside_listening_is_ignored(self):
        comm = await connect()
        await comm.send_to(bytes_data=b"\x00\x01" * 48000)
        await comm.send_json_to({"type": "audio.end"})
        self.assertEqual((await comm.receive_json_from())["type"], "error")
        await comm.disconnect()

    async def test_nothing_heard_is_a_friendly_error(self):
        self.fake.return_value = ""
        comm = await connect()
        await comm.send_json_to({"type": "audio.start"}); await comm.receive_json_from()
        await comm.send_to(bytes_data=b"\x00\x00" * 8000)
        await comm.send_json_to({"type": "audio.end"})
        events = await collect_until(comm, lambda e: e["type"] == "error")
        self.assertIn("didn't catch", events[-1]["message"])
        await comm.disconnect()

    async def test_whisper_down_is_reported_to_the_user(self):
        self.fake.side_effect = stt.SttError("Speech recognition isn't running. Start whisper-server and try again.")
        comm = await connect()
        await comm.send_json_to({"type": "audio.start"}); await comm.receive_json_from()
        await comm.send_to(bytes_data=b"\x00\x00" * 8000)
        await comm.send_json_to({"type": "audio.end"})
        events = await collect_until(comm, lambda e: e["type"] == "error")
        self.assertIn("whisper-server", events[-1]["message"])
        await comm.disconnect()

    async def test_malformed_message_gets_error_not_crash(self):
        comm = await connect()
        await comm.send_to(text_data="not json")
        self.assertEqual((await comm.receive_json_from())["type"], "error")
        await comm.disconnect()

    async def test_interrupt_returns_to_idle(self):
        comm = await connect()
        await comm.send_json_to({"type": "interrupt"})
        self.assertEqual(await comm.receive_json_from(), IDLE)
        await comm.disconnect()
