import asyncio
import json
import logging
import time
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer

from . import pipeline, stt
from .agent import Session

log = logging.getLogger(__name__)
MAX_AUDIO_BYTES = 16000 * 2 * 60   # at most 60 s of 16 kHz PCM16 per turn
PARTIAL_MIN_NEW = 16000 * 2 * 6 // 10  # live transcript: needs 0.6 s of new audio since the last attempt


class AssistantConsumer(AsyncWebsocketConsumer):
    """One WebSocket = one conversation. Speaks the protocol in the frontend's docs/API_CONTRACT.md."""

    async def connect(self):
        qs = parse_qs(self.scope["query_string"].decode())
        self.client_id = (qs.get("client") or ["anonymous"])[0][:64]  # anonymous per-browser id
        self.audio = bytearray()
        self.task = self.partial_task = None
        self.partial_mark = 0
        self.listening = False
        self.session = Session(self.client_id)  # conversation memory for this socket
        await self.accept()

    async def disconnect(self, code):
        self._cancel()

    def _cancel(self):
        self.listening = False
        for t in (self.task, self.partial_task):
            if t and not t.done():
                t.cancel()
        self.task = self.partial_task = None

    async def emit(self, event: dict):
        await self.send(text_data=json.dumps(event))

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data is not None:  # mic frames: PCM16LE mono 16 kHz
            if self.listening and len(self.audio) + len(bytes_data) <= MAX_AUDIO_BYTES:
                self.audio.extend(bytes_data)
                self._maybe_partial()
            return
        try:
            msg = json.loads(text_data or "")
            kind = msg.get("type")
        except (ValueError, AttributeError):
            return await self.emit({"type": "error", "message": "Malformed message."})

        if kind == "text.message":
            text = str(msg.get("text", "")).strip()[:2000]
            if text:
                self._start(text)
        elif kind == "audio.start":
            self._cancel()
            self.audio, self.partial_mark, self.listening = bytearray(), 0, True
            await self.emit({"type": "state", "state": "listening"})
        elif kind == "audio.end":
            self._start(None)
        elif kind == "apply.confirm":
            ids = [i for i in (msg.get("jobIds") or []) if isinstance(i, int)][:10]
            if ids:
                self._cancel()
                self.task = asyncio.create_task(self._guard(pipeline.run_apply(self.emit, ids, self.session)))
        elif kind == "interrupt":
            self._cancel()
            await self.emit({"type": "state", "state": "idle"})

    def _maybe_partial(self):
        """Live transcript while the user is still talking. One request at a time, started the moment the previous one ends;
        whisper is re-run on all audio so far (it is not a word-by-word model)."""
        busy = self.partial_task and not self.partial_task.done()
        if not busy and len(self.audio) - self.partial_mark >= PARTIAL_MIN_NEW:
            self.partial_mark = len(self.audio)
            self.partial_task = asyncio.create_task(self._partial(bytes(self.audio)))

    async def _partial(self, snapshot):
        started = time.monotonic()
        try:
            text = await stt.transcribe(snapshot, fast=True)
        except stt.SttError:
            return  # best effort: the final pass reports real problems
        log.info("live transcript: %.1fs of audio took %.2fs -> %r", len(snapshot) / 32000, time.monotonic() - started, text)
        if text and self.listening:
            await self.emit({"type": "transcript.partial", "text": text})

    def _start(self, text):
        self._cancel()
        audio, self.audio = bytes(self.audio), bytearray()
        self.task = asyncio.create_task(self._turn(text, audio))

    async def _turn(self, text, audio):
        await self._guard(pipeline.run_turn(self.emit, text, audio, self.session))

    async def _guard(self, coro):
        try:
            await coro
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("turn failed (client %s)", self.client_id)
            await self.emit({"type": "error", "message": "Something went wrong on the server."})
