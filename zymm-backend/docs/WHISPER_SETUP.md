# Setting up whisper.cpp (speech-to-text)

Zymm talks to whisper.cpp's own `whisper-server` over HTTP. It keeps the model loaded, so each request is fast.

## 1. Build it (once)
Needs git, CMake and a C++ compiler (Windows: "Build Tools for Visual Studio" with the C++ workload).
```
git clone https://github.com/ggml-org/whisper.cpp
cd whisper.cpp
cmake -B build
cmake --build build -j --config Release
```

## 2. Download a model (once)
```
sh ./models/download-ggml-model.sh base.en
```
On Windows run that in Git Bash. Or download `ggml-base.en.bin` from the whisper.cpp page on Hugging Face into `models/`.
- `tiny.en`: fastest, least accurate. `base.en`: good starting point. `small.en`: more accurate, slower on CPU.
- `.en` models are English only. Use a model without `.en` (and `-l auto`) for other languages.

## 3. Start the server (keep it running in its own terminal)
```
./build/bin/whisper-server -m models/ggml-base.en.bin --host 127.0.0.1 --port 8081 -sns
```
On Windows the program is usually `build\bin\Release\whisper-server.exe`. If your build puts it elsewhere, search for `whisper-server`.
Keep `--host 127.0.0.1` so only your machine can reach it, and don't run it as administrator (the whisper.cpp docs warn about this).

## 4. Check the connection
From the zymm-backend folder, with Django's venv active:
```
python manage.py check_whisper
```
You should see "whisper-server is reachable".

## Settings (environment variables, both optional)
- `WHISPER_URL`: default `http://127.0.0.1:8081`
- `STT_BACKEND`: default `whisper`. Set to `stub` to work without whisper (voice turns return placeholder text).

## Faster live text while you talk (recommended)
Whisper isn't word-by-word. The live transcript re-reads everything you've said so far, and each read costs a fixed amount of time.
A tiny model makes those reads quick, while your accurate model still does the final pass. Run two servers:
```
sh ./models/download-ggml-model.sh tiny.en
./build/bin/whisper-server -m models/ggml-tiny.en.bin --host 127.0.0.1 --port 8082 -sns      # live text (second terminal)
./build/bin/whisper-server -m models/ggml-base.en.bin --host 127.0.0.1 --port 8081 -sns      # final text (first terminal)
```
Then tell Django about the fast one before starting it.
- Windows PowerShell: `$env:WHISPER_PARTIAL_URL="http://127.0.0.1:8082"`
- macOS/Linux: `export WHISPER_PARTIAL_URL=http://127.0.0.1:8082`

Run `python manage.py check_whisper` to test both. The Django terminal prints a line for every live and final transcript with how long it took.
