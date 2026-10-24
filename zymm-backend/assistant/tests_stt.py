import json
import threading
import wave
import io
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest import IsolatedAsyncioTestCase, TestCase, mock

from . import stt


class FakeWhisper(BaseHTTPRequestHandler):
    """Mimics whisper.cpp's whisper-server: POST /inference (multipart with a WAV `file`) -> {"text": ...}."""
    seen = []
    reply = {"text": " Find me marketing jobs in New York."}

    def do_POST(self):
        body = self.rfile.read(int(self.headers["Content-Length"]))
        type(self).seen.append((self.path, self.headers["Content-Type"], body))
        out = json.dumps(type(self).reply).encode()
        self.send_response(200); self.send_header("Content-Length", str(len(out))); self.end_headers(); self.wfile.write(out)

    def log_message(self, *a):
        pass


class SttHelperTests(TestCase):
    def test_pcm_to_wav_is_a_valid_16k_mono_wav(self):
        with wave.open(io.BytesIO(stt.pcm_to_wav(b"\x00\x01" * 1600))) as w:
            self.assertEqual((w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()), (1, 2, 16000, 1600))

    def test_clean_removes_whisper_noise_markers(self):
        self.assertEqual(stt.clean(" [BLANK_AUDIO] "), "")
        self.assertEqual(stt.clean("(upbeat music) Find  jobs ♪"), "Find jobs")


class SttServerTests(IsolatedAsyncioTestCase):
    def setUp(self):
        FakeWhisper.seen.clear(); FakeWhisper.reply = {"text": " Find me marketing jobs in New York."}
        self.srv = ThreadingHTTPServer(("127.0.0.1", 0), FakeWhisper)
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        p = mock.patch.object(stt, "WHISPER_URL", f"http://127.0.0.1:{self.srv.server_port}")
        p.start(); self.addCleanup(p.stop); self.addCleanup(self.srv.shutdown)

    async def test_posts_wav_to_inference_and_returns_clean_text(self):
        text = await stt.transcribe(b"\x01\x00" * 16000)
        self.assertEqual(text, "Find me marketing jobs in New York.")
        path, ctype, body = FakeWhisper.seen[0]
        self.assertEqual(path, "/inference")
        self.assertTrue(ctype.startswith("multipart/form-data; boundary="))
        self.assertIn(b"RIFF", body)
        self.assertIn(b'name="response_format"', body)

    async def test_too_short_audio_skips_whisper(self):
        self.assertEqual(await stt.transcribe(b"\x00\x00" * 100), "")
        self.assertEqual(FakeWhisper.seen, [])

    async def test_blank_audio_marker_becomes_empty(self):
        FakeWhisper.reply = {"text": " [BLANK_AUDIO]"}
        self.assertEqual(await stt.transcribe(b"\x00\x00" * 16000), "")

    async def test_unreachable_server_raises_friendly_error(self):
        self.srv.shutdown(); self.srv.server_close()
        with self.assertRaisesRegex(stt.SttError, "whisper-server"):
            await stt.transcribe(b"\x00\x00" * 16000)


class SecondFake(FakeWhisper):
    seen = []
    reply = {"text": " live words"}


class LiveServerRoutingTests(IsolatedAsyncioTestCase):
    async def test_live_text_uses_the_fast_server_and_final_uses_the_main_one(self):
        FakeWhisper.seen.clear(); SecondFake.seen.clear(); FakeWhisper.reply = {"text": " final words"}
        main, fast = (ThreadingHTTPServer(("127.0.0.1", 0), h) for h in (FakeWhisper, SecondFake))
        for s in (main, fast):
            threading.Thread(target=s.serve_forever, daemon=True).start(); self.addCleanup(s.shutdown)
        with mock.patch.object(stt, "WHISPER_URL", f"http://127.0.0.1:{main.server_port}"), \
             mock.patch.object(stt, "WHISPER_PARTIAL_URL", f"http://127.0.0.1:{fast.server_port}"):
            self.assertEqual(await stt.transcribe(b"\x01\x00" * 16000, fast=True), "live words")
            self.assertEqual(await stt.transcribe(b"\x01\x00" * 16000), "final words")
        self.assertEqual((len(SecondFake.seen), len(FakeWhisper.seen)), (1, 1))
