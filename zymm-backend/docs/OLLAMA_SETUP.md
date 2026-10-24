# Setting up Ollama + Qwen3-8B (Zymm's brain)

1. Install Ollama from https://ollama.com (Windows, macOS and Linux installers). It runs in the background after install.
2. Download the model (about 5 GB, once):
   ```
   ollama pull qwen3:8b
   ```
   Plan for roughly 8 GB of free RAM (or graphics-card memory). It runs on CPU but replies are slower.
3. Check from the zymm-backend folder:
   ```
   python manage.py check_ollama
   ```
4. The first question after a break is slow because the model loads into memory. After that replies start quickly.

Settings (environment variables, all optional)
- `OLLAMA_URL` default `http://127.0.0.1:11434`
- `OLLAMA_MODEL` default `qwen3:8b`
- `LLM_BACKEND` default `ollama`; set `stub` to run the app without Ollama (canned sample reply)
