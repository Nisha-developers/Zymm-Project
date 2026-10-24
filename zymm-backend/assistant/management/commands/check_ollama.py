from django.core.management.base import BaseCommand, CommandError
from assistant import llm


class Command(BaseCommand):
    help = "Check that Ollama is running and the Qwen3 model is installed."

    def handle(self, *args, **opts):
        try:
            names = llm.list_models()
        except llm.LlmError as e:
            raise CommandError(f"{e}  (looking at {llm.OLLAMA_URL})")
        if not any(n == llm.OLLAMA_MODEL or n.split(":")[0] == llm.OLLAMA_MODEL for n in names):
            raise CommandError(f"Ollama is running, but {llm.OLLAMA_MODEL} isn't installed. Run: ollama pull {llm.OLLAMA_MODEL}  (installed: {', '.join(names) or 'none'})")
        self.stdout.write(self.style.SUCCESS(f"Ollama is running and {llm.OLLAMA_MODEL} is installed."))
