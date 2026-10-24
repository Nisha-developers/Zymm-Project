import asyncio
from django.core.management.base import BaseCommand, CommandError
from assistant import stt


class Command(BaseCommand):
    help = "Check that whisper-server is running and reachable."

    def handle(self, *args, **opts):
        wav = stt.pcm_to_wav(b"\x00\x00" * stt.SAMPLE_RATE)  # one second of silence
        checks = [("final", stt.WHISPER_URL, False)]
        if stt.WHISPER_PARTIAL_URL:
            checks.append(("live", stt.WHISPER_PARTIAL_URL, True))
        for label, url, fast in checks:
            try:
                stt._post(wav, fast)
            except stt.SttError as e:
                raise CommandError(f"{e}  (the {label} whisper-server at {url})")
            self.stdout.write(self.style.SUCCESS(f"{label} whisper-server is reachable at {url}"))
        if not stt.WHISPER_PARTIAL_URL:
            self.stdout.write("Tip: set WHISPER_PARTIAL_URL to a second, tiny.en server for faster live text (see docs/WHISPER_SETUP.md).")
