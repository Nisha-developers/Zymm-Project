# Zymm backend (Django + Channels)

## Run
```
python -m venv venv
venv\Scripts\activate          # Windows   (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
python manage.py runserver     # serves http://localhost:8000 and ws://localhost:8000/ws/assistant/
```
Check it: open http://localhost:8000/api/health -> {"status": "ok"}

## Connect the frontend
In the frontend project's `.env`: `VITE_USE_MOCK=false`, then restart `npm run dev`.

## Tests
`python manage.py test`

## Status
B1 done: project, WebSocket, protocol, stub pipeline (`assistant/pipeline.py`).
Next: B2 models, B3 whisper.cpp, B4 Qwen3 + tools, B5 Kokoro.
Database: SQLite by default. For MySQL set DB_ENGINE=mysql, DB_NAME, DB_USER, DB_PASSWORD, DB_HOST and `pip install mysqlclient`.

## B2: database and REST API
```
python manage.py migrate
python manage.py seed_jobs      # 14 sample jobs from fictional companies (safe to re-run)
python manage.py test           # 16 tests
```
Endpoints (send header `X-Client-Id` on everything except jobs): GET /api/jobs/search, GET /api/jobs/{id},
GET|POST /api/resumes, GET|PUT /api/resumes/{id}, GET /api/resumes/{id}/export (501 until B9),
GET|POST /api/applications, GET /api/conversations.
Notes: `match` is a placeholder keyword score (null when there is nothing to compare); replaced in B4.
Resume `score` is completeness (0-100). Each client only ever sees its own resumes, applications and conversations.

## B3: speech-to-text (whisper.cpp)
Follow `docs/WHISPER_SETUP.md`, then `python manage.py check_whisper`.
While the user talks, a live transcript (`transcript.partial`) refreshes about every 1.5 s. When they tap done, the full
audio is transcribed once more (`transcript.final`) and the turn continues. Silence/noise gives "I didn't catch that";
whisper-server not running gives "Speech recognition isn't running" (shown with the Retry button).
Tests (25) use a fake whisper-server that mimics the documented API; run `python manage.py test`.

## B4: Qwen3-8B via Ollama
Follow `docs/OLLAMA_SETUP.md`, then `python manage.py check_ollama`.
Zymm now decides what to do: tools `search_jobs`, `get_company`, `build_resume`, `apply_to_job` (see `assistant/tools.py`).
`apply_to_job` only proposes (`tool.result kind:"confirm_apply"`); applications are recorded only after the client sends
`{type:"apply.confirm", jobIds:[...]}`. Conversations and messages are saved, so GET /api/conversations is populated.
38 tests: `python manage.py test`.
