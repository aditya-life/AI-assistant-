# 🦾 J.A.R.V.I.S. / STARK OS — MASTER PROJECT BLUEPRINT
### Complete Architectural Blueprint & Reproduction Guide (v3.5.0)

> **Document Version:** 3.5.0  
> **Target Platforms:** macOS (Host & Automation Controller) + iOS / Android (Mobile HUD Client)  
> **Language Support:** Bilingual (Pure Hindi, Roman Hinglish & English)  
> **Primary Technology Stack:** Python 3.10+ (FastAPI, Uvicorn, WebSockets), Google Gemini AI API, Offline Neural Memory Distillation, Vanilla JS (ES6+), Web Audio API, Web Speech API, HTML5 Canvas, CSS Custom Variables, PWA.

---

## 1. Project Overview & Architecture

J.A.R.V.I.S. is a hybrid, bidirectional, bilingual voice-controlled assistant featuring a dual-stage neural intelligence core:
1. **Stage 1 (0ms Ultra-Fast Offline Engine):** Built-in native rules + dynamic learned neural cache (`learned_intents.json`).
2. **Stage 2 (Cloud Hybrid Fallback & Continuous Auto-Distillation):** When the offline engine encounters an unknown query, Google Gemini AI (1.5/2.0 Flash) answers and simultaneously compiles and trains the offline neural memory so that **all subsequent queries are handled 100% locally with 0ms latency and 0 API cost!**

### System Architecture Diagram

```mermaid
graph TD
    subgraph ClientLayer["📱 Mobile & 🖥️ Mac HUD Clients"]
        VoiceInput["Voice / Text User Input (Hindi / English)"]
        OfflineFilter{"Stage 1: Local Offline Rules & Memory?"}
        LocalResponse["0ms Instant Speech & Mac Automation"]
    end

    subgraph HybridAIEngine["🧠 Hybrid AI & Online Distillation Core"]
        CloudFallback["Stage 2: Google Gemini Flash AI (POST /api/ai/query)"]
        Distillation["Auto-Distillation & Training Compiler"]
        OfflineMemory[("🧠 Offline Neural Matrix: learned_intents.json")]
    end

    subgraph MacExecution["⚙️ macOS System Controller"]
        MacCore["App Launch, Volume, Screen Sleep, YouTube Vanced Direct Play"]
    end

    VoiceInput --> OfflineFilter
    OfflineFilter -->|Match Found (0ms)| LocalResponse
    OfflineFilter -->|Unknown Query & AI: ON| CloudFallback
    CloudFallback --> Distillation
    Distillation -->|Auto-Saves New Skills| OfflineMemory
    OfflineMemory -.->|Feeds 0ms Cache to| OfflineFilter
    LocalResponse --> MacCore
```

---

## 2. Directory & File Breakdown

```
jarvis-assistant/
│
├── server.py               # 🚀 FastAPI Backend Server (WebSockets, Gemini AI, YouTube Resolver, Mac Execution)
├── server.js               # 🌐 Node.js Express Backend Fallback
├── config.json             # ⚙️ Persistent Configuration (AI Mode, Speech Rates, Themes, Contact)
├── notes.json              # 📝 Stark Memory Matrix Persistent Voice Notes
├── learned_intents.json    # 🧠 Offline Learned Neural Skills Matrix (Continuous Auto-Distillation Cache)
├── requirements.txt        # 📦 Python Dependencies (fastapi, uvicorn, websockets, qrcode, pillow, psutil, requests)
├── start.sh                # ⚡ 1-Click Launch Script
│
├── cert.pem & key.pem      # 🔒 Local SSL/TLS Certificates for HTTPS
│
├── test_bilingual.py       # 🧪 Bilingual Intent & Speed Control Audit
├── test_youtube_and_speed.py # 🧪 YouTube Play & Ad-Skipping QA Suite
├── test_gemini_and_autotrain.py # 🧪 Gemini AI & Continuous Self-Training QA Suite
├── test_jarvis.py          # 🧪 Full 8-Level System Integrity Test Suite
├── test_mobile_deep.py     # 🧪 Mobile PWA & Touch Ergonomics Emulation
│
├── public/                 # 🎨 Frontend Stark HUD Client Assets
│   ├── index.html          # Stark HUD Dashboard, AI Toggle, Modals, Quick Chips
│   ├── styles.css          # Stark Cyberpunk Theme System & Responsive CSS
│   ├── app.js              # 🧠 JarvisCore Neural Engine (STT, TTS, Offline Memory, Gemini Distillation)
│   ├── audio-fx.js         # 🔊 Web Audio API Procedural Sound Synthesizer
│   ├── manifest.json       # 📱 Standalone PWA Manifest for Android & iOS
│   └── sw.js               # 🔄 Service Worker Offline Caching
│
└── BLUEPRINT.md            # 📖 This Complete Master Blueprint Document
```

---

## 3. Core Features & Capabilities

### 1. 🇮🇳 Bilingual Natural Language Processing (Hindi + Hinglish + English)
- Multi-script support: Accepts Devanagari Hindi (e.g. *गाना बजाओ*), Roman Hinglish (*"YouTube pe Iron Man video chalao"*), and Pure English (*"Set master volume to 70 percent"*).
- Instant 1-click HUD toggle between **Hindi (🇮🇳 HI)** and **English (🇬🇧 EN)** mode.
- Voice-activated language switching (*"Hindi me bolo"* / *"Switch to English"*).

### 2. 🎬 YouTube Direct Auto-Play Engine
- Distinguishes between **Play Intent** (*"chalao"*, *"bajao"*, *"play"*, *"sunao"*, *"laga do"*) and **Search Intent** (*"search karo"*, *"dikhao"*, *"list dikhao"*).
- When a user asks to play a video or song, the backend scrapes and extracts the first matching YouTube video ID (`videoId`) in `< 500ms` and immediately launches:
  `https://www.youtube.com/watch?v={videoId}&autoplay=1`
- Works directly on both the Mac desktop browser and mobile device.

### 3. 🗣️ Calibrated Hindi TTS & Dynamic Voice Speed Control
- **Default Hindi Speed:** Calibrated to **0.85x** for clear, natural, and comfortable Hindi vocal delivery.
- **Voice-Driven Speed Control:**
  - *"Thoda fast bolo"* / *"Tez bolo"* / *"Speed badhao"* $\rightarrow$ Increases speed dynamically (+0.15x) and acknowledges in faster tempo.
  - *"Thoda slow bolo"* / *"Dheere bolo"* / *"Aaram se bolo"* $\rightarrow$ Slows down speech tempo (-0.15x) for crystal-clear comprehension.
  - *"Normal bolo"* / *"Reset speed"* $\rightarrow$ Resets speech rate to default.
- Interactive speed sliders in the HUD Settings modal with real-time numeric indicators.

### 4. 📱 Mobile Command Audio Isolation
- When a command is triggered from a mobile device (via voice, quick chip, or text):
  - The voice audio response plays **ONLY on the mobile device**.
  - Mac hardware actions (volume, app launching, screenshot, screen lock) execute silently on the Mac.
  - Mac console receives synchronized transcript logs without blaring audio over room speakers.

### 5. 🖥️ Workstation System Automation (macOS Native)
- Master volume calibration (0–100%, mute, unmute).
- Instant workstation screen lockdown (`pmset displaysleepnow`).
- Silent desktop screenshot archiving to `~/Desktop/Screenshot_JARVIS_*.png`.
- Application launcher (Google Chrome, VS Code, Terminal, etc.).
- Universal synchronized clipboard sync between Phone and Mac.

### 6. 🎧 Focus Protocol (432Hz Binaural Drone) & Sentry Mode
- Real-time procedural audio synthesis using Web Audio API oscillators (no external audio files needed).
- 432Hz harmonic soundscape for deep concentration.
- Sentry surveillance alarm mode with camera HUD scanner.

---

## 4. Step-by-Step Guide to Rebuild from Scratch

### Step 1: Initialize Workspace & Python Environment

```bash
mkdir jarvis-assistant
cd jarvis-assistant

# Create Python Virtual Environment
python3 -m venv venv
source venv/bin/activate

# Install Core Dependencies
pip install fastapi uvicorn websockets qrcode pillow psutil requests
```

Create `requirements.txt`:
```txt
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
websockets>=13.0
qrcode>=7.4.2
pillow>=10.0.0
psutil>=5.9.0
requests>=2.31.0
```

---

### Step 2: Generate SSL Certificates for Local HTTPS

Modern browsers (Chrome, Safari) require **HTTPS** to allow persistent microphone access and camera permissions on mobile devices over LAN.

Generate self-signed certificate valid for LAN IP access:
```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=IN/ST=Delhi/L=NewDelhi/O=StarkLabs/OU=JARVIS/CN=127.0.0.1"
```

---

### Step 3: Build the FastAPI Backend Server (`server.py`)

Key components to implement in `server.py`:
1. **WebSocket Connection Hub:** Manages active connected clients (Mac HUD and paired Mobile devices).
2. **YouTube Video Resolver:** Extracts the first matching YouTube video ID:
   ```python
   def resolve_youtube_first_video(query: str):
       encoded = urllib.parse.quote(query.strip())
       search_url = f"https://www.youtube.com/results?search_query={encoded}"
       req = urllib.request.Request(search_url, headers={"User-Agent": "Mozilla/5.0 ..."})
       with urllib.request.urlopen(req, context=ctx, timeout=3.0) as resp:
           html = resp.read().decode("utf-8", errors="ignore")
           video_ids = re.findall(r"\"videoId\":\"([a-zA-Z0-9_-]{11})\"", html)
           if video_ids:
               return {
                   "success": True,
                   "videoId": video_ids[0],
                   "watchUrl": f"https://www.youtube.com/watch?v={video_ids[0]}&autoplay=1"
               }
   ```
3. **Mac Automation Command Runner (`execute_mac_command`):**
   - Uses `subprocess.run` with `open`, `osascript`, `pmset`, `screencapture`.
4. **QR Code Generator:** Generates pairing QR code as base64 PNG so mobile phones can connect instantly via camera scan.
5. **System Telemetry:** Real-time CPU, RAM, battery charging status, uptime via `psutil`.

---

### Step 4: Build the Frontend HUD (`public/`)

1. **`index.html`**:
   - Header with assistant persona name, live millisecond telemetry clock, language toggle (`[🇮🇳 HI / 🇬🇧 EN]`), and modal triggers.
   - Left diagnostics column for CPU, RAM, Power Cells, and Weather.
   - Center stage with 60 FPS rotating Canvas Arc Reactor and audio oscilloscope.
   - Right column App Matrix (YouTube, Spotify, Maps, WhatsApp, Chrome, Call) and Mac overrides.
   - Bottom command log feed, quick voice chips, and manual text transmitter.

2. **`styles.css`**:
   - Stark CSS design system using variables:
     - Cyan Theme (`--primary: #00e5ff`, `--secondary: #0077aa`, `--bg-dark: #03080e`)
     - Gold Theme (`--primary: #ffd700`, `--secondary: #c59b27`, `--bg-dark: #0a0800`)
     - Emerald Theme (`--primary: #00ff88`, `--secondary: #00aa55`, `--bg-dark: #020c06`)
     - Stealth Theme (`--primary: #e0e0e0`, `--secondary: #707070`, `--bg-dark: #080808`)
   - Responsive flexbox and grid layouts optimized for desktop monitors, iPads, and mobile screens.

3. **`audio-fx.js`**:
   - Procedural Web Audio API sound synthesizer:
     - `playWake()`: Rising frequency double-blip (880Hz $\rightarrow$ 1320Hz).
     - `playProcessing()`: Short high-tech data packet blip.
     - `playSuccess()`: Ascending Stark triad chords (523Hz $\rightarrow$ 659Hz $\rightarrow$ 783Hz).
     - `toggleFocusAmbience()`: Dual oscillator binaural drone tuned to 432Hz with 4Hz alpha wave beat.

4. **`app.js`**:
   - `JarvisCore` class handling:
     - STT (`webkitSpeechRecognition` / `SpeechRecognition`) with dual language switching.
     - TTS (`speechSynthesis`) with custom Hindi rate calibration (default 0.85x) and high-quality voice prioritization.
     - Dynamic speech rate adjusters (`adjustSpeakingSpeed`).
     - Deep Bilingual intent parser.
     - Device-isolated event handling.

---

### Step 5: Mobile PWA Setup (`manifest.json` & `sw.js`)

1. **`manifest.json`**:
   ```json
   {
     "name": "J.A.R.V.I.S. Stark OS",
     "short_name": "JARVIS",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#03080e",
     "theme_color": "#03080e",
     "icons": [
       { "src": "/favicon.ico", "sizes": "64x64", "type": "image/x-icon" }
     ]
   }
   ```
2. **`sw.js`**: Service worker caching core HUD assets for fast loading.

---

## 5. Bilingual Voice Command Reference Matrix

| Category | Hindi Voice Phrases (Roman & Devanagari) | English Voice Phrases | Action / System Response |
| :--- | :--- | :--- | :--- |
| **YouTube Play** | *"YouTube par Arijit Singh gana chalao"*, *"video play karo"*, *"यूट्यूब पर चलाओ"* | *"Play Iron Man 4 trailer on YouTube"*, *"Play Kesariya on YouTube"* | Resolves top video ID and auto-plays direct video URL. |
| **YouTube Ad Skip** | *"Ad skip karo"*, *"Add skip karo"*, *"Ads hatao"*, *"ऐड स्किप करो"*, *"विज्ञापन छोड़ो"* | *"Skip ad"*, *"Skip advertisement"* | Executes AppleScript & JS trigger to skip/fast-forward YouTube video ads. |
| **YouTube Search** | *"YouTube par search karo Iron Man"*, *"trailers dikhao"* | *"Search quantum computing on YouTube"* | Opens YouTube search results page. |
| **Speed Control** | *"Thoda fast bolo"*, *"Tez bolo"*, *"Speed badhao"*, *"Dheere bolo"*, *"Slow bolo"* | *"Speak faster"*, *"Speak slower"*, *"Reset voice speed"* | Dynamically adjusts TTS rate (+/-0.15x) and confirms at new tempo. |
| **Language Toggle** | *"Hindi me bolo"*, *"Switch to Hindi"*, *"English me bolo"* | *"Switch to English"*, *"Speak in English"* | Switches STT and TTS language mode immediately. |
| **Spotify / Music** | *"Spotify par gaana bajao"*, *"music lagao"*, *"gana chalao"* | *"Play synthwave on Spotify"*, *"Play music"* | Launches Spotify and offers acoustic volume calibration. |
| **Volume Control** | *"Volume 80 percent karo"*, *"awaz badhao"*, *"awaz kam karo"*, *"mute kar do"* | *"Set master volume to 80%"*, *"Mute volume"*, *"Turn up sound"* | Calibrates macOS master audio output. |
| **Lock Screen** | *"Screen lock kar do"*, *"Mac band kar do"*, *"sleep mode me daalo"* | *"Lock workstation"*, *"Put display to sleep"* | Executes macOS display lockdown (`pmset displaysleepnow`). |
| **Screenshot** | *"Screenshot lo"*, *"photo kheecho"*, *"snap lo"* | *"Take a screenshot"*, *"Capture screen"* | Saves timestamped screenshot to `~/Desktop/` and offers preview. |
| **Weather** | *"Mausam kaisa hai"*, *"Delhi me taapmaan kitna hai"*, *"barish hogi kya"* | *"What's the weather today"*, *"Current temperature"* | Fetches and speaks live weather telemetry. |
| **Battery & Power** | *"Battery kitni hai"*, *"charge ho raha hai kya"*, *"power status batao"* | *"Battery status"*, *"Check power reserves"* | Reads macOS power cells and charging line telemetry. |
| **Time & Date** | *"Time kya hua hai"*, *"samay batao"*, *"aaj kaun si date hai"* | *"What time is it"*, *"Current date"* | Reports precise system time and calendar date. |
| **Memory Notes** | *"Note likho kal 4 baje meeting hai"*, *"notes dikhao"*, *"saare notes delete karo"* | *"Note down buy milk"*, *"Show notes"*, *"Clear notes"* | Creates, displays, or deletes entries in Stark Memory Matrix. |
| **Math / Calculator** | *"Pachas plus sau kitna hota hai"*, *"500 ka 20 percent kitna hai"* | *"Calculate 45 times 8"*, *"What is 15 percent of 1200"* | Computes arithmetic and speaks precise numerical answer. |
| **Focus Protocol** | *"Focus mode chalao"*, *"focus music shuru karo"* | *"Engage focus protocol"*, *"Start focus ambience"* | Synthesizes 432Hz alpha-harmonic binaural drone. |
| **Greetings / Status**| *"Kaise ho"*, *"kya haal hai"*, *"sun rahe ho"*, *"shubh prabhat"* | *"How are you"*, *"Can you hear me"*, *"Good morning"* | Responds with authentic Stark assistant persona. |

---

## 6. How to Run the Assistant

### Option A: 1-Click Script
```bash
./start.sh
```

### Option B: Manual Command
```bash
./venv/bin/python3 server.py
```

- **Mac Desktop Console:** Open `https://localhost:3000` (or `http://localhost:3000`)
- **Mobile Access:** Open `https://<YOUR_LOCAL_IP>:3000` or scan the pairing QR code displayed in the HUD.

---

## 7. Running the Automated QA Verification Test Suites

```bash
# 1. Bilingual Hindi + English Intent Engine Audit
./venv/bin/python3 test_bilingual.py

# 2. YouTube Auto-Play & Voice Speed Verification
./venv/bin/python3 test_youtube_and_speed.py

# 3. Full 8-Level System Integrity & Endpoint QA
./venv/bin/python3 test_jarvis.py

# 4. Deep Mobile PWA & Touch Emulation Audit
./venv/bin/python3 test_mobile_deep.py
```

---
*Built with ❤️ for Stark Industries & Next-Gen Workstation Automation.*
