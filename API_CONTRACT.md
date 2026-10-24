# Zymm API contract (draft, finalize with backend)
All messages are JSON over WebSocket `/ws/assistant/?client=<anonymous id>`. No authentication.

## Client -> server
- `{type:"text.message", text}`: typed or quick-action prompt
- `{type:"audio.start"}` then binary mic chunks, then `{type:"audio.end"}`  (F6)
- `{type:"interrupt"}`: stop current response

## Server -> client
- `{type:"state", state:"idle|listening|processing|speaking|error"}`  backend may drive UI state at any time
- `{type:"transcript.partial", text}` / `{type:"transcript.final", text}`  cumulative text, from whisper.cpp
- `{type:"text.delta", delta}`  streamed Qwen3 reply text
- `{type:"tool.result", kind, data}`
  - `jobs`: `{items:[{id,title,company,location,salary,match}], stats:{matches,remote,hybrid,range}}`
  - `resume`: `[{id,name,role,updated,score}]`
  - `applications`: `[{id,title,company,status,date}]`
  - `company`: `{name,industry,size,location,rating,openRoles,blurb}`
- `{type:"audio.chunk"}` binary Kokoro audio (F6)
- `{type:"error", message}`

## REST (header `X-Client-Id`)
GET /api/jobs/search?role=&location=&salary_min= · GET /api/jobs/{id}
GET|POST /api/resumes · GET /api/resumes/{id}/export
GET|POST /api/applications · GET /api/conversations

## Audio formats (F6)
- Mic -> server: binary WebSocket frames, raw PCM16LE mono 16 kHz, ~100 ms (1600 samples) each, between `audio.start` and `audio.end`.
- Server -> client: binary frames, raw PCM16LE mono 24 kHz (Kokoro native), streamed as generated; client queues them gapless.
- End of turn: client sends `audio.end` when the user taps done; backend may also detect silence itself and send `{type:"state",state:"processing"}`.
- `interrupt` must make the backend stop generating and stop sending audio.

## Resumes and applications (F7)
- `PUT /api/resumes/{id}` / `POST /api/resumes`: body `{title, fullName, role, email, phone, location, summary, experience:[{id,role,company,dates,bullets}], education:[{id,school,degree,dates}], skills:[]}`
- `GET /api/resumes/{id}/export?format=pdf|docx`: returns the file (blob)
- `POST /api/applications`: body `{jobId, resumeId, coverLetter|null}`; user has already confirmed in the UI
- Assistant-initiated applying MUST ask first: send `tool.result kind:"confirm_apply"` `{jobs:[...]}`, then only apply after client sends `{type:"apply.confirm", jobIds:[...]}`.
