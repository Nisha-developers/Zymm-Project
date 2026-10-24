"""Speech-to-text through whisper.cpp's own `whisper-server` (HTTP, model stays loaded in memory).
Mic audio arrives as PCM16 mono 16 kHz; we wrap it as WAV and POST it to /inference."""
import asyncio
import io
import json
import os
import re
import urllib.error
import urllib.request
import uuid
import wave

WHISPER_URL = os.environ.get("WHISPER_URL", "http://127.0.0.1:8081")
# Optional second, smaller/faster whisper-server used only for the live transcript while you talk.
WHISPER_PARTIAL_URL = os.environ.get("WHISPER_PARTIAL_URL", "")
STT_BACKEND = os.environ.get("STT_BACKEND", "whisper")  # "stub" = placeholder text, for working without whisper installed
SAMPLE_RATE = 16000
MIN_SECONDS = 0.4
TIMEOUT = 60
PROMPT = "Zymm, job search, resume, software engineer, marketing, New York, remote, salary, apply."  # biases vocabulary


class SttError(Exception):
    """A problem the user should see (message is safe to show)."""


def pcm_to_wav(pcm: bytes) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm)
    return buf.getvalue()


def _multipart(fields: dict, wav: bytes):
    b = uuid.uuid4().hex
    parts = [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in fields.items()]
    parts.append(f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n'.encode() + wav + b"\r\n")
    parts.append(f"--{b}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={b}"


def clean(text: str) -> str:
    """Whisper marks silence/noise as [BLANK_AUDIO], (music), ♪ ... None of that is something the user said."""
    return re.sub(r"\s+", " ", re.sub(r"\[[^\]]*\]|\([^)]*\)|[♪♫]+", "", text)).strip()


def _post(wav: bytes, fast: bool = False) -> str:
    body, ctype = _multipart({"response_format": "json", "temperature": "0.0", "prompt": PROMPT}, wav)
    base = WHISPER_PARTIAL_URL if (fast and WHISPER_PARTIAL_URL) else WHISPER_URL
    req = urllib.request.Request(base.rstrip("/") + "/inference", data=body, headers={"Content-Type": ctype})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))  # never route localhost through a system proxy
    try:
        with opener.open(req, timeout=TIMEOUT) as r:
            return str(json.loads(r.read()).get("text", ""))
    except urllib.error.HTTPError as e:
        raise SttError(f"Speech recognition failed (server answered {e.code}).") from e
    except (urllib.error.URLError, OSError) as e:
        raise SttError("Speech recognition isn't running. Start whisper-server and try again.") from e
    except ValueError as e:
        raise SttError("Speech recognition returned an unreadable answer.") from e


async def transcribe(pcm: bytes, fast: bool = False) -> str:
    """Returns the cleaned transcript ('' if there was no speech). Raises SttError if whisper is unavailable."""
    if STT_BACKEND == "stub":
        return f"(voice message, {len(pcm) / 32000:.1f}s. whisper is switched off)"
    if len(pcm) < MIN_SECONDS * SAMPLE_RATE * 2:
        return ""
    return clean(await asyncio.to_thread(_post, pcm_to_wav(pcm), fast))
