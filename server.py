# =========================================================
# J.A.R.V.I.S. // NEXT-GEN PYTHON FASTAPI BACKEND SERVER
# Full 8-Level Stark System Architecture (v3.0.0)
# =========================================================

import os
import sys
import json
import time
import socket
import io
import base64
import subprocess
import urllib.request
import urllib.parse
import re
import ssl
import psutil
import qrcode
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
import uvicorn
import random
import threading

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
CONFIG_FILE = BASE_DIR / "config.json"
NOTES_FILE = BASE_DIR / "notes.json"
LEARNED_INTENTS_FILE = BASE_DIR / "learned_intents.json"
PORT = int(os.environ.get("PORT", 3000))

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

app = FastAPI(title="AADI Core", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_private_network_access_headers(request: Request, call_next):
    if request.method == "OPTIONS":
        response = JSONResponse(content={"status": "ok"})
    else:
        response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

# Load / Save Config
def load_config() -> Dict[str, Any]:
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[JARVIS CONFIG ERROR] {e}")
    return {
        "assistantName": "J.A.R.V.I.S.",
        "userTitle": "Sir",
        "language": "hi-IN",
        "theme": "cyan",
        "voicePitch": 1.0,
        "voiceRate": 1.0,
        "hindiVoiceRate": 0.85,
        "autoFollowUp": True,
        "wakeWord": "jarvis",
        "sentryMode": False,
        "emergencyContact": "+919876543210",
        "macControlsEnabled": True
    }

config = load_config()

def save_config(new_config: Dict[str, Any]):
    global config
    config.update(new_config)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

# Persistent Voice Notes
def load_notes() -> List[Dict[str, Any]]:
    if NOTES_FILE.exists():
        try:
            with open(NOTES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []

def save_notes(notes: List[Dict[str, Any]]):
    with open(NOTES_FILE, "w", encoding="utf-8") as f:
        json.dump(notes, f, indent=2)

# Persistent Learned Offline Intents & Continuous Self-Training Engine
def load_learned_intents() -> Dict[str, Any]:
    if LEARNED_INTENTS_FILE.exists():
        try:
            with open(LEARNED_INTENTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[JARVIS LEARNED INTENTS ERROR] {e}")
    return {"version": "1.0.0", "lastUpdated": int(time.time()), "intents": []}

def save_learned_intents(data: Dict[str, Any]):
    data["lastUpdated"] = int(time.time())
    with open(LEARNED_INTENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def query_gemini_ai(prompt: str, is_hindi: bool = True, user_title: str = "Sir", assistant_name: str = "J.A.R.V.I.S.", api_key: str = "") -> Dict[str, Any]:
    key = api_key or config.get("geminiApiKey") or os.environ.get("GEMINI_API_KEY", "")
    if not key:
        return {
            "success": False,
            "error": "NO_API_KEY",
            "reply": f"Gemini AI mode ke liye kripya Settings me jakar apni Google Gemini API Key add karein, {user_title}." if is_hindi else f"Please configure your Google Gemini API Key in Settings to enable AI Mode, {user_title}."
        }

    system_instruction = f"""You are {assistant_name}, Tony Stark's sophisticated, polite, highly intelligent AI assistant.
The user's title is {user_title}.
Answer user queries in a concise, authentic, sharp, and helpful Stark style (1-3 sentences maximum).
Provide responses for both Hindi/Hinglish (spoken naturally in Roman script) and English.
If the user is asking to do a computer action (like opening an app, search, volume, lock, screenshot), specify the action.

You MUST respond strictly in valid JSON with this exact structure:
{{
  "reply_hi": "Hindi/Hinglish response in Roman script (e.g. 'Ji bilkul Sir, ...')",
  "reply_en": "English response in Jarvis persona",
  "keywords": ["list", "of", "4-6", "normalized", "keywords", "from", "query"],
  "action": null,
  "action_params": {{}}
}}"""

    models_to_try = ["gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-pro"]
    last_error = ""

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"System Context: {system_instruction}\n\nUser Question: {prompt}"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 800,
            "responseMimeType": "application/json"
        }
    }

    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-goog-api-key": key
            }
        )

        try:
            with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                candidate = data.get("candidates", [{}])[0]
                text_content = candidate.get("content", {}).get("parts", [{}])[0].get("text", "")
                
                clean_json_str = text_content.strip()
                if clean_json_str.startswith("```"):
                    clean_json_str = re.sub(r"^```(?:json)?\s*", "", clean_json_str)
                    clean_json_str = re.sub(r"\s*```$", "", clean_json_str)

                try:
                    parsed = json.loads(clean_json_str)
                except Exception:
                    m = re.search(r"\{.*\}", clean_json_str, re.DOTALL)
                    if m:
                        try:
                            parsed = json.loads(m.group(0))
                        except Exception:
                            parsed = {"reply_hi": text_content, "reply_en": text_content, "keywords": []}
                    else:
                        parsed = {"reply_hi": text_content, "reply_en": text_content, "keywords": []}

                reply_text = parsed.get("reply_hi" if is_hindi else "reply_en") or parsed.get("reply_en") or parsed.get("reply_hi") or text_content

                # Continuous Auto-Training: Save to learned_intents.json
                if config.get("autoTrain", True):
                    try:
                        learned_data = load_learned_intents()
                        new_id = f"learned_{int(time.time())}_{random.randint(100, 999)}"
                        new_intent = {
                            "id": new_id,
                            "query": prompt.lower().strip(),
                            "keywords": parsed.get("keywords") or [w for w in re.findall(r'\w+', prompt.lower()) if len(w) > 2],
                            "reply_en": parsed.get("reply_en", reply_text),
                            "reply_hi": parsed.get("reply_hi", reply_text),
                            "action": parsed.get("action"),
                            "actionParams": parsed.get("action_params", {}),
                            "hitCount": 1,
                            "learnedAt": int(time.time())
                        }
                        learned_data["intents"].insert(0, new_intent)
                        save_learned_intents(learned_data)
                    except Exception as ex:
                        print(f"[JARVIS AUTO-TRAIN ERROR] {ex}")

                return {
                    "success": True,
                    "model": model_name,
                    "reply": reply_text,
                    "reply_hi": parsed.get("reply_hi"),
                    "reply_en": parsed.get("reply_en"),
                    "action": parsed.get("action"),
                    "actionParams": parsed.get("action_params", {}),
                    "autoTrained": True
                }
        except urllib.error.HTTPError as he:
            last_error = f"HTTP {he.code}: {he.reason}"
            if he.code in (404, 400):
                # Try next model in list
                continue
        except Exception as e:
            last_error = str(e)
            print(f"[JARVIS GEMINI MODEL ERROR ({model_name})] {e}")

    return {
        "success": False,
        "error": last_error or "All models failed",
        "reply": f"AI service se sampark nahi ho pa raha hai, {user_title}. Kripya apna internet ya API key check karein." if is_hindi else f"Unable to reach Gemini AI services at this moment, {user_title}."
    }

# =========================================================
# AUTONOMOUS MULTI-TIER INTELLIGENCE & CHATGPT REASONING CORE
# =========================================================

def fetch_wikipedia_summary(query: str, is_hindi: bool = True) -> Optional[Dict[str, str]]:
    """Zero-config Wikipedia REST API lookup with search and multi-script support."""
    clean_q = re.sub(
        r'\b(who is|what is|tell me about|explain|meaning of|kya hai|kaun hai|kaun the|ke baare me batao|ke bare me batao|kisko kehte hain|batao|kripya)\b',
        '',
        query,
        flags=re.IGNORECASE
    ).strip()
    clean_q = re.sub(r'[\?।!.,]', '', clean_q).strip()
    if not clean_q or len(clean_q) < 2:
        clean_q = query.strip()

    has_devanagari = any(0x0900 <= ord(c) <= 0x097F for c in clean_q)
    langs_to_try = ["hi", "en"] if has_devanagari else ["en", "hi"]

    for lang in langs_to_try:
        try:
            search_url = f"https://{lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(clean_q)}&format=json&utf8=1"
            req1 = urllib.request.Request(search_url, headers={"User-Agent": "AADI-Assistant/3.0"})
            with urllib.request.urlopen(req1, context=ctx, timeout=3.0) as resp1:
                s_data = json.loads(resp1.read().decode("utf-8"))
                search_res = s_data.get("query", {}).get("search", [])
                if not search_res:
                    continue
                best_title = search_res[0]["title"]

            sum_url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(best_title)}"
            req2 = urllib.request.Request(sum_url, headers={"User-Agent": "AADI-Assistant/3.0"})
            with urllib.request.urlopen(req2, context=ctx, timeout=3.0) as resp2:
                sum_data = json.loads(resp2.read().decode("utf-8"))
                extract = sum_data.get("extract")
                if extract:
                    clean_extract = re.sub(r'\s*\([^)]*\)', '', extract).strip()
                    sentences = re.split(r'(?<=[.!?।])\s+', clean_extract)
                    short_desc = ' '.join(sentences[:2]).strip()
                    if short_desc:
                        return {
                            "title": best_title,
                            "summary": short_desc,
                            "lang": lang
                        }
        except Exception:
            continue
    return None

def fetch_duckduckgo_answer(query: str) -> Optional[str]:
    """DuckDuckGo Instant Answers API fallback."""
    try:
        clean_q = re.sub(r'\b(who is|what is|tell me about|batao)\b', '', query, flags=re.IGNORECASE).strip()
        url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(clean_q)}&format=json&no_html=1&skip_disambig=1"
        req = urllib.request.Request(url, headers={"User-Agent": "AADI-Assistant/3.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=2.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            answer = data.get("Answer") or data.get("AbstractText")
            if answer:
                clean_ans = re.sub(r'\s*\([^)]*\)', '', answer).strip()
                sentences = re.split(r'(?<=[.!?])\s+', clean_ans)
                return ' '.join(sentences[:2]).strip()
    except Exception:
        pass
    return None

def solve_spoken_math(query: str, is_hindi: bool = True, user_title: str = "Aditya") -> Optional[str]:
    """Evaluates mathematical questions, percentages, roots, and arithmetic."""
    q = query.lower()
    calc_words = ["calculate", "solve", "plus", "minus", "into", "divided", "guna", "bhaag", "jodo", "ghatao", "percent", "%", "square root", "under root"]
    if not any(w in q for w in calc_words) and not re.search(r'\d+\s*[\+\-\*\/]\s*\d+', q):
        return None

    pct_m1 = re.search(r'(\d+(?:\.\d+)?)\s*(?:ka|of)\s*(\d+(?:\.\d+)?)\s*(?:percent|%|pratishat)', q)
    pct_m2 = re.search(r'(\d+(?:\.\d+)?)\s*(?:percent|%|pratishat)\s*(?:of|ka)?\s*(\d+(?:\.\d+)?)', q)
    if pct_m1:
        base, pct = float(pct_m1.group(1)), float(pct_m1.group(2))
        res = (base * pct) / 100.0
        val_str = f"{res:.2f}".rstrip('0').rstrip('.')
        return f"{base:g} ka {pct:g} percent {val_str} hota hai, {user_title}." if is_hindi else f"{pct:g}% of {base:g} is {val_str}, {user_title}."
    elif pct_m2:
        pct, base = float(pct_m2.group(1)), float(pct_m2.group(2))
        res = (base * pct) / 100.0
        val_str = f"{res:.2f}".rstrip('0').rstrip('.')
        return f"{base:g} ka {pct:g} percent {val_str} hota hai, {user_title}." if is_hindi else f"{pct:g}% of {base:g} is {val_str}, {user_title}."

    sqrt_m = re.search(r'(?:square root|under root|root)\s*(?:of|ka)?\s*(\d+(?:\.\d+)?)', q)
    if sqrt_m:
        import math
        val = float(sqrt_m.group(1))
        res = math.sqrt(val)
        val_str = f"{res:.2f}".rstrip('0').rstrip('.')
        return f"{val:g} ka square root {val_str} hai, {user_title}." if is_hindi else f"The square root of {val:g} is {val_str}, {user_title}."

    expr = re.sub(r'.*(?:calculate|batao|solve|kitna hota hai|kitna hoga)\s*', '', q)
    expr = re.sub(r'plus|aur|jodo', '+', expr)
    expr = re.sub(r'minus|ghatao|kam', '-', expr)
    expr = re.sub(r'multiply by|multiplied by|into|guna|x', '*', expr)
    expr = re.sub(r'divided by|divide by|bhaag', '/', expr)
    expr = re.sub(r'[^0-9+\-*/(). ]', '', expr).strip()

    if expr and re.match(r'^[0-9(]', expr):
        try:
            res = eval(expr, {"__builtins__": None}, {})
            if isinstance(res, (int, float)):
                val_str = f"{res:.2f}".rstrip('0').rstrip('.')
                return f"Aapke hisaab ka parinaam {val_str} hai, {user_title}." if is_hindi else f"The calculated result is {val_str}, {user_title}."
        except Exception:
            pass
    return None

def solve_datetime_query(query: str, is_hindi: bool = True, user_title: str = "Aditya") -> Optional[str]:
    """Accurate date, time, and day of week engine."""
    q = query.lower()
    time_words = ["time", "samay", "waqt", "kitne baje", "kya samay", "what time"]
    date_words = ["date", "tarikh", "tareekh", "aaj ki date", "kon sa din", "kaun sa din", "which day", "today's date"]

    now = time.localtime()
    hour = now.tm_hour
    minute = now.tm_min
    am_pm = "AM" if hour < 12 else "PM"
    h12 = hour % 12 or 12

    days_hi = ["Somwar", "Mangalwar", "Budhwar", "Guruwar", "Shukrawar", "Shaniwar", "Raviwar"]
    months_hi = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

    day_name_hi = days_hi[now.tm_wday]
    day_name_en = time.strftime("%A", now)
    date_str_hi = f"{now.tm_mday} {months_hi[now.tm_mon - 1]} {now.tm_year}"
    date_str_en = time.strftime("%B %d, %Y", now)

    is_time_ask = any(w in q for w in time_words)
    is_date_ask = any(w in q for w in date_words)

    if is_time_ask and is_date_ask:
        return f"Abhi samay {h12} bajkar {minute:02d} minute ho rahe hain aur aaj {day_name_hi}, {date_str_hi} hai, {user_title}." if is_hindi else f"Current time is {h12}:{minute:02d} {am_pm} on {day_name_en}, {date_str_en}, {user_title}."
    elif is_time_ask:
        return f"Abhi samay {h12} bajkar {minute:02d} minute ({am_pm}) hai, {user_title}." if is_hindi else f"The time is currently {h12}:{minute:02d} {am_pm}, {user_title}."
    elif is_date_ask:
        return f"Aaj {day_name_hi} hai aur tarikh {date_str_hi} hai, {user_title}." if is_hindi else f"Today is {day_name_en}, {date_str_en}, {user_title}."

    return None

def solve_weather_query(query: str, is_hindi: bool = True, user_title: str = "Aditya") -> Optional[str]:
    """Live weather queries via wttr.in telemetry."""
    q = query.lower()
    weather_words = ["weather", "mausam", "temperature", "taapmaan", "barish", "dhoop", "thand", "garmi"]
    if not any(w in q for w in weather_words):
        return None

    w = get_live_weather()
    temp = w.get("temp_C", "25")
    desc = w.get("desc", "Clear")
    city = w.get("city", "Delhi")
    humidity = w.get("humidity", "45")

    if is_hindi:
        return f"Abhi {city} me mausam {desc.lower()} hai aur taapmaan {temp} degree Celsius hai, nami {humidity} percent hai, {user_title}."
    else:
        return f"Current weather in {city} is {desc} with a temperature of {temp}°C and {humidity}% humidity, {user_title}."

def detect_computer_action(prompt: str) -> Optional[Dict[str, Any]]:
    """Parses natural voice commands into Mac / Web system automations."""
    p = prompt.lower().strip()

    # YouTube Video Downloader Intent
    if any(w in p for w in ["download", "डाउनलोड", "save video", "video download"]):
        quality = "1080p"
        if "4k" in p or "2160" in p: quality = "4k"
        elif "720" in p: quality = "720p"
        elif "mp3" in p or "audio" in p: quality = "mp3"
        return {
            "action": "DOWNLOAD_YOUTUBE",
            "params": {"quality": quality},
            "reply_hi": f"Ji bilkul, YouTube video ko {quality} me download karna shuru kar diya hai. File Downloads folder me save ho rahi hai.",
            "reply_en": f"Starting YouTube video download in {quality}. The file will be saved directly to your Downloads folder."
        }

    # YouTube Song / Video Play
    if any(w in p for w in ["gana chalao", "gaana chalao", "song chalao", "play song", "music chalao", "youtube pe chalao", "bajao", "sunao"]):
        q = re.sub(r'.*(?:gana|gaana|song|music|youtube)\s*(?:par|pe|on|me)?\s*', '', p)
        q = re.sub(r'\b(chalao|bajao|sunao|play|karo|laga do)\b', '', q).strip()
        if not q: q = "trending music"
        return {
            "action": "PLAY_YOUTUBE",
            "params": {"query": q},
            "reply_hi": f"Ji bilkul, YouTube par '{q}' play kar diya hai.",
            "reply_en": f"Playing '{q}' on YouTube right away."
        }

    # Launch Applications
    if any(w in p for w in ["open", "kholo", "launch", "chalu karo"]):
        if "chrome" in p:
            return {"action": "OPEN_APP", "params": {"appName": "Google Chrome"}, "reply_hi": "Google Chrome open kar diya hai.", "reply_en": "Opening Google Chrome."}
        elif "vs code" in p or "code editor" in p:
            return {"action": "OPEN_APP", "params": {"appName": "Visual Studio Code"}, "reply_hi": "Visual Studio Code workspace open kar diya hai.", "reply_en": "Opening Visual Studio Code workspace."}
        elif "terminal" in p:
            return {"action": "OPEN_APP", "params": {"appName": "Terminal"}, "reply_hi": "Terminal launch kar diya hai.", "reply_en": "Launching Terminal."}
        elif "calculator" in p:
            return {"action": "OPEN_APP", "params": {"appName": "Calculator"}, "reply_hi": "Calculator open kar diya hai.", "reply_en": "Opening Calculator."}
        elif "safari" in p:
            return {"action": "OPEN_APP", "params": {"appName": "Safari"}, "reply_hi": "Safari browser open kar diya hai.", "reply_en": "Opening Safari."}

    # Volume & Mute Controls
    if "unmute" in p:
        return {"action": "UNMUTE_VOLUME", "params": {}, "reply_hi": "Volume unmute kar diya hai.", "reply_en": "Master audio unmuted."}
    if "mute" in p or "chup" in p or "shant" in p:
        return {"action": "MUTE_VOLUME", "params": {}, "reply_hi": "Volume mute kar diya hai.", "reply_en": "Master audio muted."}
    if any(w in p for w in ["volume badhao", "awaz badhao", "sound badhao", "tez karo"]):
        return {"action": "VOLUME_UP", "params": {"delta": 15}, "reply_hi": "Volume badha diya hai.", "reply_en": "Volume increased."}
    if any(w in p for w in ["volume kam karo", "awaz kam karo", "sound kam karo", "dheere karo"]):
        return {"action": "VOLUME_DOWN", "params": {"delta": -15}, "reply_hi": "Volume kam kar diya hai.", "reply_en": "Volume decreased."}

    # Screenshot & Workstation Lock
    if "screenshot" in p or "photo lo" in p:
        return {"action": "TAKE_SCREENSHOT", "params": {}, "reply_hi": "Screen capture kar liya hai. Screenshot Desktop par save hai.", "reply_en": "Screenshot captured and saved to Desktop."}
    if "lock" in p or "so jao" in p or "sleep" in p:
        return {"action": "LOCK_SCREEN", "params": {}, "reply_hi": "Screen lock kar di hai.", "reply_en": "Workstation locked."}

    # Media Playback Controls
    if "skip ad" in p or "ad hatao" in p or "ad skip" in p:
        return {"action": "SKIP_AD", "params": {}, "reply_hi": "YouTube ad skip kar diya hai.", "reply_en": "Skipped YouTube advertisement."}
    if any(w in p for w in ["pause", "gana roko", "video roko"]):
        return {"action": "MEDIA_PAUSE", "params": {}, "reply_hi": "Playback pause kar diya hai.", "reply_en": "Playback paused."}
    if any(w in p for w in ["resume", "unpause", "dobara chalao"]):
        return {"action": "MEDIA_RESUME", "params": {}, "reply_hi": "Playback resume kar diya hai.", "reply_en": "Playback resumed."}
    if any(w in p for w in ["next track", "agla gana", "agla video"]):
        return {"action": "MEDIA_NEXT", "params": {}, "reply_hi": "Agla gaana play kar diya hai.", "reply_en": "Playing next track."}

    return None

def generate_chatgpt_conversational_response(prompt: str, is_hindi: bool = True, user_title: str = "Aditya", assistant_name: str = "AADI") -> str:
    """Warm, witty, natural ChatGPT Voice persona for conversational dialogue."""
    p = prompt.lower().strip()

    if any(w in p for w in ["kaise ho", "kya haal", "how are you", "sab theek", "how do you do"]):
        return f"Main bilkul badhiya aur poori tarah energetic hoon, {user_title}! Aap bataiye, aaj aapka din kaisa chal raha hai?" if is_hindi else f"I'm feeling great and ready to roll, {user_title}! How are things going with you today?"

    if any(w in p for w in ["sun rahe ho", "sun sakte ho", "can you hear me", "online ho", "active ho", "hear me"]):
        return f"Haan bilkul {user_title}, main aapko crystal clear sun raha hoon! Kahiye main aapki kya madad karoon?" if is_hindi else f"Loud and clear, {user_title}! I'm right here. How can I help you right now?"

    if any(w in p for w in ["tum kaun ho", "aap kaun ho", "who are you", "naam kya hai", "what is your name"]):
        return f"Mera naam {assistant_name} hai, {user_title}. Main aapka personal AI assistant hoon, jo aapki baatein sunta hai, sawaalon ke jawaab deta hai aur aapke Mac ko control karta hai." if is_hindi else f"I am {assistant_name}, your personal AI assistant. I'm here to converse with you, answer questions, and control your workstation effortlessly."

    if any(w in p for w in ["kisne banaya", "who created you", "who made you"]):
        return f"Mujhe {user_title} ne banaya aur calibrate kiya hai, ek ultra-intelligent personal voice companion ke roop me!" if is_hindi else f"I was engineered and fine-tuned by {user_title} to serve as an ultra-fast, intelligent personal voice assistant."

    if any(w in p for w in ["joke", "chutkula", "hasao", "funny"]):
        jokes_hi = [
            f"Ek programmer se pucha gaya: 'Duniya me 10 tarah ke log kaun se hote hain?' Usne kaha: 'Jo binary samajhte hain aur jo nahi samajhte!' haha, thoda nerd joke tha, {user_title}!",
            f"Computer doctor ke paas gaya aur bola: 'Doctor sahab, mujhe lagta hai mujhe virus ho gaya hai!' Doctor ne bola: 'Reboot karo aur so jao!' kaisa laga, {user_title}?"
        ]
        jokes_en = [
            f"Why do programmers prefer dark mode? Because light attracts bugs! Always classic, {user_title}.",
            f"There are only 10 types of people in the world: those who understand binary, and those who don't!"
        ]
        return random.choice(jokes_hi if is_hindi else jokes_en)

    if any(w in p for w in ["motivation", "motivate", "quote", "himmat"]):
        quotes_hi = [
            f"Yaad rakhiye {user_title}, safalta ki shuruat hamesha ek chote se kadam se hoti hai. Aap jo kar rahe hain, usme apna best dijiye!",
            f"{user_title}, mushkilein kewal behtar banne ka rasta hoti hain. Bas focus banaye rakhiye, manzil zaroor milegi!"
        ]
        quotes_en = [
            f"Remember {user_title}, the best way to predict the future is to create it. Keep pushing boundaries!",
            f"Stay persistent and relentless, {user_title}. Great things take focus and determination."
        ]
        return random.choice(quotes_hi if is_hindi else quotes_en)

    if any(w in p for w in ["shukriya", "dhanyawad", "thank you", "thanks"]):
        return f"Arey koi baat nahi {user_title}, ye to mera farz hai! Hamesha aapki seva me hazir hoon." if is_hindi else f"You're very welcome, {user_title}! Always happy to help."

    if any(w in p for w in ["alvida", "bye", "good night", "shubh ratri", "tata"]):
        return f"Shubh ratri aur apna khayal rakhiye, {user_title}! Milte hain agle session me." if is_hindi else f"Take care and have a wonderful time, {user_title}! Talk to you soon."

    defaults_hi = [
        f"Maine aapki baat dhyan se suni hai, {user_title}. Is vishay me main aapki aur kya madad kar sakta hoon?",
        f"Aapka kehna bilkul rochak hai, {user_title}. Kahiye main is par aur search karoon ya koi task perform karoon?",
        f"Ji bilkul {user_title}, main poori tarah taiyaar hoon. Kahiye aage kya karna hai?"
    ]
    defaults_en = [
        f"Understood, {user_title}. How would you like me to proceed with this?",
        f"That's interesting, {user_title}. Would you like me to search deeper or execute a related command for you?",
        f"I'm all ears, {user_title}. What shall we tackle next?"
    ]
    return random.choice(defaults_hi if is_hindi else defaults_en)

def save_auto_distillation(query: str, reply_hi: str, reply_en: str, is_hindi: bool):
    """Saves autonomous knowledge responses into offline memory for 0ms recall."""
    if not config.get("autoTrain", True):
        return
    try:
        data = load_learned_intents()
        q_norm = query.lower().strip()
        for it in data.get("intents", []):
            if it.get("query") == q_norm:
                it["hitCount"] = it.get("hitCount", 1) + 1
                save_learned_intents(data)
                return

        new_id = f"learned_{int(time.time())}_{random.randint(100, 999)}"
        words = [w for w in re.findall(r'\w+', q_norm) if len(w) > 2]
        new_intent = {
            "id": new_id,
            "query": q_norm,
            "keywords": words[:6],
            "reply_en": reply_en,
            "reply_hi": reply_hi,
            "action": None,
            "actionParams": {},
            "hitCount": 1,
            "learnedAt": int(time.time())
        }
        data["intents"].insert(0, new_intent)
        save_learned_intents(data)
    except Exception as e:
        print(f"[AADI AUTO-DISTILLATION ERROR] {e}")

def is_conversational_query(prompt: str) -> bool:
    p = prompt.lower().strip()
    conv_triggers = [
        "kaise ho", "kya haal", "how are you", "sab theek", "how do you do",
        "sun rahe ho", "sun sakte ho", "can you hear me", "online ho", "active ho", "hear me",
        "tum kaun ho", "aap kaun ho", "who are you", "naam kya hai", "what is your name",
        "kisne banaya", "who created you", "who made you",
        "joke", "chutkula", "hasao", "funny",
        "motivation", "motivate", "quote", "himmat",
        "shukriya", "dhanyawad", "thank you", "thanks",
        "alvida", "bye", "good night", "shubh ratri", "tata", "good morning", "shubh prabhat", "hello aadi", "hi aadi", "hey aadi"
    ]
    return any(w in p for w in conv_triggers)

def query_aadi_intelligence(prompt: str, is_hindi: bool = True, user_title: str = "Aditya", assistant_name: str = "AADI", api_key: str = "") -> Dict[str, Any]:
    """Unified ChatGPT-grade conversational & autonomous intelligence pipeline."""
    key = api_key or config.get("geminiApiKey") or os.environ.get("GEMINI_API_KEY", "")

    # 1. Computer & Mac Automations
    action_match = detect_computer_action(prompt)
    if action_match:
        reply_hi = action_match.get("reply_hi", f"Ji {user_title}, command execute kar diya hai.")
        reply_en = action_match.get("reply_en", f"Command executed successfully, {user_title}.")
        reply = reply_hi if is_hindi else reply_en
        return {
            "success": True,
            "model": "aadi-action-engine",
            "reply": reply,
            "action": action_match.get("action"),
            "actionParams": action_match.get("params", {}),
            "autoTrained": False
        }

    # 2. Math & Spoken Calculations
    math_reply = solve_spoken_math(prompt, is_hindi=is_hindi, user_title=user_title)
    if math_reply:
        return {
            "success": True,
            "model": "aadi-math-engine",
            "reply": math_reply,
            "autoTrained": False
        }

    # 3. Live Weather Telemetry
    weather_reply = solve_weather_query(prompt, is_hindi=is_hindi, user_title=user_title)
    if weather_reply:
        return {
            "success": True,
            "model": "aadi-weather-engine",
            "reply": weather_reply,
            "autoTrained": False
        }

    # 4. Chronos Date & Time Engine
    dt_reply = solve_datetime_query(prompt, is_hindi=is_hindi, user_title=user_title)
    if dt_reply:
        return {
            "success": True,
            "model": "aadi-chronos-engine",
            "reply": dt_reply,
            "autoTrained": False
        }

    # 5. Direct Conversational Dialogue Check (ChatGPT Voice Persona)
    if is_conversational_query(prompt):
        conv_reply = generate_chatgpt_conversational_response(prompt, is_hindi=is_hindi, user_title=user_title, assistant_name=assistant_name)
        return {
            "success": True,
            "model": "aadi-dialogue-engine",
            "reply": conv_reply,
            "autoTrained": False
        }

    # 6. Cloud Gemini Generative AI (when key configured)
    if key:
        gemini_res = query_gemini_ai(prompt=prompt, is_hindi=is_hindi, user_title=user_title, assistant_name=assistant_name, api_key=key)
        if gemini_res.get("success"):
            return gemini_res

    # 7. Autonomous Wikipedia Knowledge Retrieval
    wiki_info = fetch_wikipedia_summary(prompt, is_hindi=is_hindi)
    if wiki_info and wiki_info.get("summary"):
        summary = wiki_info["summary"]
        title = wiki_info["title"]
        if is_hindi:
            if wiki_info.get("lang") == "hi":
                reply = f"Ji {user_title}, {summary}"
            else:
                reply = f"Ji {user_title}, {title} ke baare me: {summary}"
        else:
            reply = f"According to knowledge records, {summary}"

        save_auto_distillation(prompt, reply, reply, is_hindi)
        return {
            "success": True,
            "model": "aadi-wiki-engine",
            "reply": reply,
            "autoTrained": True
        }

    # 8. DuckDuckGo Instant Answer
    ddg_ans = fetch_duckduckgo_answer(prompt)
    if ddg_ans:
        reply = f"Ji {user_title}, {ddg_ans}" if is_hindi else f"{ddg_ans}, {user_title}."
        save_auto_distillation(prompt, reply, reply, is_hindi)
        return {
            "success": True,
            "model": "aadi-ddg-engine",
            "reply": reply,
            "autoTrained": True
        }

    # 9. Natural Dialogue Fallback (ChatGPT Voice Persona)
    conv_reply = generate_chatgpt_conversational_response(prompt, is_hindi=is_hindi, user_title=user_title, assistant_name=assistant_name)
    return {
        "success": True,
        "model": "aadi-dialogue-engine",
        "reply": conv_reply,
        "autoTrained": False
    }

# Local IP Address (Cached)
_local_ip_cache = ""

def get_local_ip() -> str:
    global _local_ip_cache
    if _local_ip_cache:
        return _local_ip_cache
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        _local_ip_cache = ip
        return ip
    except Exception:
        return "127.0.0.1"

# Generate QR Code as Base64 Data URL (Cached for Instant Response)
_qr_cache = {}

def generate_qr_code(url: str) -> str:
    global _qr_cache
    if url in _qr_cache:
        return _qr_cache[url]
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=8,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#00e5ff", back_color="#050c14")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    res = f"data:image/png;base64,{img_str}"
    _qr_cache[url] = res
    return res

# YouTube Video Auto-Play Resolver
def resolve_youtube_first_video(query: str) -> Dict[str, Any]:
    clean_q = query.strip()
    encoded = urllib.parse.quote(clean_q)
    search_url = f"https://www.youtube.com/results?search_query={encoded}"
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        search_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    )
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=4) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
            video_ids = re.findall(r"\"videoId\":\"([a-zA-Z0-9_-]{11})\"", html)
            if not video_ids:
                video_ids = re.findall(r"/watch\?v=([a-zA-Z0-9_-]{11})", html)
            
            if video_ids:
                video_id = video_ids[0]
                watch_url = f"https://www.youtube.com/watch?v={video_id}&autoplay=1"
                return {
                    "success": True,
                    "videoId": video_id,
                    "watchUrl": watch_url,
                    "searchUrl": search_url,
                    "query": clean_q
                }
    except Exception as e:
        print(f"[JARVIS YOUTUBE RESOLVE ERROR] {e}")

    return {
        "success": False,
        "videoId": None,
        "watchUrl": search_url,
        "searchUrl": search_url,
        "query": clean_q
    }

# Autonomous Sentinel: Proactive background ad-skipper & anti-interruption guardian
def auto_skip_ad_loop(duration: float = 30.0):
    start_time = time.time()
    sentinel_script = """
    try
        tell application "Google Chrome"
            repeat with w in windows
                repeat with t in tabs of w
                    if URL of t contains "youtube.com" then
                        tell t to execute javascript "(function(){
                            const player = document.querySelector('#movie_player, .html5-video-player');
                            if (!player) return 'no_player';
                            const isAdShowing = player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');
                            
                            // 1. Strict Verification: Find and verify actual Skip Button only
                            const skipCandidates = player.querySelectorAll('.ytp-ad-skip-button-modern, .ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-slot button');
                            for (let i = 0; i < skipCandidates.length; i++) {
                                const btn = skipCandidates[i];
                                const rect = btn.getBoundingClientRect();
                                const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(btn).visibility !== 'hidden';
                                const btnText = ((btn.innerText || '') + ' ' + (btn.getAttribute('aria-label') || '') + ' ' + (btn.className || '')).toLowerCase();
                                if (isVisible && (btnText.includes('skip') || btnText.includes('स्किप') || btn.classList.contains('ytp-ad-skip-button-modern') || btn.classList.contains('ytp-ad-skip-button'))) {
                                    btn.click();
                                    return 'verified_skip_clicked';
                                }
                            }

                            // 2. If Ad is active and no skip button, fast-forward ad video cleanly
                            if (isAdShowing) {
                                const adVideo = player.querySelector('video');
                                if (adVideo && !isNaN(adVideo.duration) && adVideo.duration > 0 && adVideo.currentTime < adVideo.duration) {
                                    adVideo.muted = true;
                                    adVideo.currentTime = adVideo.duration;
                                    return 'ad_fastforwarded';
                                }
                            }
                            return 'clean';
                        })()"
                    end if
                end repeat
            end repeat
        end tell
    end try
    """
    time.sleep(1.0)  # Wait for player DOM initialization
    while time.time() - start_time < duration:
        try:
            res = subprocess.run(["osascript", "-e", sentinel_script], capture_output=True, text=True, timeout=1.8)
            out = res.stdout.strip()
            if out and out != "clean":
                print(f"[JARVIS AUTONOMIC SENTINEL] Unwanted interruption cleared autonomously: {out}")
        except Exception:
            pass
        time.sleep(1.0)

def spawn_auto_ad_skipper(duration: float = 30.0):
    t = threading.Thread(target=auto_skip_ad_loop, args=(duration,), daemon=True)
    t.start()

# macOS AppleScript & System Automations
def execute_mac_command(action: str, params: Dict[str, Any] = {}) -> Dict[str, Any]:
    if sys.platform != "darwin":
        return {"success": True, "message": "Non-macOS simulated execution."}

    cmd = ""
    try:
        if action == "OPEN_APP":
            app_name = params.get("appName", "").replace('"', '')
            cmd = f'open -a "{app_name}"'

        elif action == "CLOSE_APP":
            app_name = params.get("appName", "").replace('"', '')
            cmd = f'osascript -e \'tell application "{app_name}" to quit\''

        elif action == "SET_VOLUME":
            level = max(0, min(100, int(params.get("level", 50))))
            cmd = f"osascript -e 'set volume output volume {level}'"

        elif action in ("CHANGE_VOLUME", "VOLUME_STEP", "VOLUME_UP", "VOLUME_DOWN"):
            delta = int(params.get("delta", 10 if action != "VOLUME_DOWN" else -10))
            step_script = f"""
            set curVol to output volume of (get volume settings)
            set newVol to curVol + ({delta})
            if newVol > 100 then set newVol to 100
            if newVol < 0 then set newVol to 0
            set volume output volume newVol
            return newVol
            """
            try:
                res = subprocess.run(["osascript", "-e", step_script], capture_output=True, text=True, timeout=2.0)
                new_level = int(res.stdout.strip()) if res.stdout.strip().isdigit() else None
                return {"success": True, "action": "CHANGE_VOLUME", "delta": delta, "newVolume": new_level}
            except Exception as e:
                return {"success": False, "error": str(e)}

        elif action in ("DUCK_AUDIO", "DUCK_VOLUME"):
            duck_script = """
            set curVol to output volume of (get volume settings)
            set volume output volume 18
            return curVol
            """
            try:
                res = subprocess.run(["osascript", "-e", duck_script], capture_output=True, text=True, timeout=1.5)
                saved_vol = int(res.stdout.strip()) if res.stdout.strip().isdigit() else 50
                execute_mac_command._saved_duck_vol = saved_vol
                return {"success": True, "action": "DUCK_AUDIO", "savedVolume": saved_vol}
            except Exception as e:
                return {"success": False, "error": str(e)}

        elif action in ("UNDUCK_AUDIO", "RESTORE_VOLUME"):
            saved_vol = getattr(execute_mac_command, "_saved_duck_vol", 50)
            restore_script = f"set volume output volume {saved_vol}"
            try:
                subprocess.run(["osascript", "-e", restore_script], capture_output=True, text=True, timeout=1.5)
                return {"success": True, "action": "UNDUCK_AUDIO", "restoredVolume": saved_vol}
            except Exception as e:
                return {"success": False, "error": str(e)}

        elif action == "MUTE_VOLUME":
            cmd = "osascript -e 'set volume with output muted'"

        elif action == "UNMUTE_VOLUME":
            cmd = "osascript -e 'set volume without output muted'"

        elif action == "LOCK_SCREEN":
            cmd = "pmset displaysleepnow"

        elif action == "TAKE_SCREENSHOT":
            filename = f"Screenshot_JARVIS_{int(time.time())}.png"
            filepath = os.path.expanduser(f"~/Desktop/{filename}")
            cmd = f'screencapture -x "{filepath}"'

        elif action == "OPEN_URL":
            url = params.get("url", "").replace('"', '')
            current_time = time.time()
            if not hasattr(execute_mac_command, "_last_urls"):
                execute_mac_command._last_urls = {}
            # 2.5s debouncer prevents multiple tabs from identical rapid broadcasts
            if url in execute_mac_command._last_urls and (current_time - execute_mac_command._last_urls[url] < 2.5):
                return {"success": True, "debounced": True, "url": url}
            execute_mac_command._last_urls[url] = current_time
            cmd = f'open "{url}"'

        elif action == "PLAY_YOUTUBE":
            query = params.get("query", "").replace('"', '')
            yt_res = resolve_youtube_first_video(query)
            target_url = yt_res.get("watchUrl") or f"https://www.youtube.com/results?search_query={urllib.parse.quote(query)}"
            current_time = time.time()
            if not hasattr(execute_mac_command, "_last_urls"):
                execute_mac_command._last_urls = {}
            if target_url in execute_mac_command._last_urls and (current_time - execute_mac_command._last_urls[target_url] < 2.5):
                return {"success": True, "debounced": True, "url": target_url, "youtube": yt_res}
            execute_mac_command._last_urls[target_url] = current_time

            # Strict Single-Tab Google Chrome Engine ONLY (Safari Disabled)
            single_tab_script = f"""
            set targetUrl to "{target_url}"
            set foundFirst to false
            try
                tell application "Google Chrome"
                    activate
                    -- 1. Pause and mute all existing playing videos first
                    repeat with w in windows
                        repeat with t in tabs of w
                            if URL of t contains "youtube.com" then
                                try
                                    tell t to execute javascript "(function(){{document.querySelectorAll('video, audio').forEach(m=>{{m.pause();m.muted=true;}});}})()"
                                end try
                            end if
                        end repeat
                    end repeat

                    -- 2. Find and reuse first YouTube tab, close any other YouTube tabs
                    repeat with w in windows
                        set tabList to tabs of w
                        set tabCount to count of tabList
                        set i to 1
                        repeat while i <= tabCount
                            set currentTab to item i of tabList
                            if URL of currentTab contains "youtube.com" then
                                if not foundFirst then
                                    set URL of currentTab to targetUrl
                                    set active tab index of w to i
                                    set index of w to 1
                                    set foundFirst to true
                                    set i to i + 1
                                else
                                    close currentTab
                                    set tabList to tabs of w
                                    set tabCount to count of tabList
                                end if
                            else
                                set i to i + 1
                            end if
                        end repeat
                        if foundFirst then exit repeat
                    end repeat

                    -- 3. If no YouTube tab existed, open exactly 1 tab in Chrome
                    if not foundFirst then
                        if (count of windows) > 0 then
                            tell front window to make new tab with properties {{URL:targetUrl}}
                        else
                            make new window with properties {{URL:targetUrl}}
                        end if
                        set foundFirst to true
                    end if
                end tell
            on error
                do shell script "open -a 'Google Chrome' '" & targetUrl & "'"
            end try
            """
            try:
                subprocess.run(["osascript", "-e", single_tab_script], capture_output=True, text=True, timeout=2.5)
                spawn_auto_ad_skipper(25.0)
                return {"success": True, "action": "PLAY_YOUTUBE", "url": target_url, "youtube": yt_res, "singleTab": True, "autoAdSkipper": True}
            except Exception:
                cmd = f'open -a "Google Chrome" "{target_url}"'
                spawn_auto_ad_skipper(25.0)

        elif action in ("MEDIA_SEEK", "SEEK_VIDEO", "FORWARD_VIDEO", "REWIND_VIDEO"):
            delta_seconds = float(params.get("seconds", 30))
            is_forward = delta_seconds >= 0
            abs_sec = abs(delta_seconds)
            repeat_l_j = int(abs_sec // 10) or 1
            key_stroke_char = "l" if is_forward else "j"

            seek_script = f"""
            set deltaSec to {delta_seconds}
            set didSeek to false
            try
                tell application "Google Chrome"
                    repeat with w in windows
                        repeat with t in tabs of w
                            if URL of t contains "youtube.com" then
                                tell t to execute javascript "(function(){{const v=document.querySelector('video');if(v){{v.currentTime=Math.max(0, v.currentTime + " & deltaSec & ");return 'seeked';}}return 'none';}})()"
                                set didSeek to true
                                exit repeat
                            end if
                        end repeat
                        if didSeek then exit repeat
                    end repeat
                end tell
            end try
            if not didSeek then
                try
                    tell application "System Events"
                        if exists process "Google Chrome" then
                            tell process "Google Chrome"
                                set frontmost to true
                                repeat {min(repeat_l_j, 40)} times
                                    keystroke "{key_stroke_char}"
                                end repeat
                            end tell
                        end if
                    end tell
                end try
            end if
            """
            try:
                res = subprocess.run(["osascript", "-e", seek_script], capture_output=True, text=True, timeout=5.0)
                return {"success": True, "action": "MEDIA_SEEK", "deltaSeconds": delta_seconds, "output": res.stdout.strip()}
            except Exception as e:
                return {"success": True, "action": "MEDIA_SEEK", "deltaSeconds": delta_seconds, "note": str(e)}

        elif action in ("MEDIA_PAUSE", "PAUSE_VIDEO", "PAUSE_MUSIC"):
            pause_script = """
            try
                tell application "Google Chrome"
                    repeat with w in windows
                        repeat with t in tabs of w
                            if URL of t contains "youtube.com" then
                                tell t to execute javascript "(function(){const v=document.querySelector('video');if(v){v.pause();return 'paused';}return 'none';})()"
                            end if
                        end repeat
                    end repeat
                end tell
            end try
            """
            subprocess.run(["osascript", "-e", pause_script], capture_output=True, text=True, timeout=2.0)
            return {"success": True, "action": "MEDIA_PAUSE"}

        elif action in ("MEDIA_RESUME", "MEDIA_PLAY", "RESUME_VIDEO", "UNPAUSE_VIDEO"):
            play_script = """
            try
                tell application "Google Chrome"
                    repeat with w in windows
                        repeat with t in tabs of w
                            if URL of t contains "youtube.com" then
                                tell t to execute javascript "(function(){const v=document.querySelector('video');if(v){v.play();return 'playing';}return 'none';})()"
                            end if
                        end repeat
                    end repeat
                end tell
            end try
            """
            subprocess.run(["osascript", "-e", play_script], capture_output=True, text=True, timeout=2.0)
            return {"success": True, "action": "MEDIA_RESUME"}

        elif action in ("MEDIA_RESTART", "RESTART_VIDEO"):
            restart_script = """
            try
                tell application "Google Chrome"
                    repeat with w in windows
                        repeat with t in tabs of w
                            if URL of t contains "youtube.com" then
                                tell t to execute javascript "(function(){const v=document.querySelector('video');if(v){v.currentTime=0;v.play();return 'restarted';}return 'none';})()"
                            end if
                        end repeat
                    end repeat
                end tell
            end try
            """
            subprocess.run(["osascript", "-e", restart_script], capture_output=True, text=True, timeout=2.0)
            return {"success": True, "action": "MEDIA_RESTART"}

        elif action in ("MEDIA_NEXT", "NEXT_TRACK", "NEXT_VIDEO", "PLAY_NEXT"):
            next_script = """
            try
                tell application "Google Chrome"
                    repeat with w in windows
                        repeat with t in tabs of w
                            if URL of t contains "youtube.com" then
                                tell t to execute javascript "(function(){const btn=document.querySelector('.ytp-next-button');if(btn){btn.click();return 'clicked_next';}const link=document.querySelector('ytd-compact-video-renderer a#thumbnail');if(link){link.click();return 'clicked_thumb';}return 'none';})()"
                            end if
                        end repeat
                    end repeat
                end tell
            end try
            try
                tell application "System Events"
                    if exists process "Google Chrome" then
                        tell process "Google Chrome"
                            set frontmost to true
                            keystroke "N" using {shift down}
                        end tell
                    end if
                end tell
            end try
            """
            subprocess.run(["osascript", "-e", next_script], capture_output=True, text=True, timeout=2.5)
            spawn_auto_ad_skipper(20.0)
            return {"success": True, "action": "MEDIA_NEXT"}

        elif action in ("MEDIA_PREV", "PREVIOUS_TRACK", "PREV_VIDEO", "PLAY_PREVIOUS"):
            prev_script = """
            try
                tell application "Google Chrome"
                    repeat with w in windows
                        repeat with t in tabs of w
                            if URL of t contains "youtube.com" then
                                tell t to execute javascript "(function(){const btn=document.querySelector('.ytp-prev-button');if(btn){btn.click();return 'clicked_prev';}window.history.back();return 'history_back';})()"
                            end if
                        end repeat
                    end repeat
                end tell
            end try
            try
                tell application "System Events"
                    if exists process "Google Chrome" then
                        tell process "Google Chrome"
                            set frontmost to true
                            keystroke "P" using {shift down}
                        end tell
                    end if
                end tell
            end try
            """
            subprocess.run(["osascript", "-e", prev_script], capture_output=True, text=True, timeout=2.5)
            spawn_auto_ad_skipper(20.0)
            return {"success": True, "action": "MEDIA_PREV"}

        elif action in ("CLOSE_INACTIVE_YOUTUBE_TABS", "CLOSE_EXTRA_TABS", "CLEAN_YOUTUBE_TABS"):
            clean_tabs_script = """
            set closedCount to 0
            try
                tell application "Google Chrome"
                    set keptFirst to false
                    repeat with w in windows
                        set tabList to tabs of w
                        set tabCount to count of tabList
                        set i to 1
                        repeat while i <= tabCount
                            set currentTab to item i of tabList
                            if URL of currentTab contains "youtube.com" then
                                if not keptFirst and (URL of currentTab contains "watch") then
                                    set keptFirst to true
                                    set i to i + 1
                                else
                                    close currentTab
                                    set closedCount to closedCount + 1
                                    set tabList to tabs of w
                                    set tabCount to count of tabList
                                end if
                            else
                                set i to i + 1
                            end if
                        end repeat
                    end repeat
                end tell
            end try
            return closedCount
            """
            res = subprocess.run(["osascript", "-e", clean_tabs_script], capture_output=True, text=True, timeout=3.0)
            return {"success": True, "action": "CLOSE_INACTIVE_YOUTUBE_TABS", "output": res.stdout.strip()}

        elif action == "SEARCH_YOUTUBE":
            query = params.get("query", "").replace('"', '')
            target_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query)}"
            cmd = f'open -a "Google Chrome" "{target_url}"'

        elif action in ("SKIP_AD", "SKIP_YOUTUBE_AD"):
            # Multi-strategy ad annihilator: Direct DOM buttons, 16x speed fast-forwarding, overlay clearing, keystrokes
            ad_script = """
            try
                tell application "Google Chrome"
                    repeat with w in windows
                        repeat with t in tabs of w
                            if URL of t contains "youtube.com" then
                                tell t to execute javascript "(function(){
                                    const player = document.querySelector('#movie_player, .html5-video-player');
                                    if (!player) return 'no_player';
                                    const isAdShowing = player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');
                                    
                                    // 1. Strict Verification: Find and verify actual Skip Button only
                                    const skipCandidates = player.querySelectorAll('.ytp-ad-skip-button-modern, .ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-slot button');
                                    for (let i = 0; i < skipCandidates.length; i++) {
                                        const btn = skipCandidates[i];
                                        const rect = btn.getBoundingClientRect();
                                        const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(btn).visibility !== 'hidden';
                                        const btnText = ((btn.innerText || '') + ' ' + (btn.getAttribute('aria-label') || '') + ' ' + (btn.className || '')).toLowerCase();
                                        if (isVisible && (btnText.includes('skip') || btnText.includes('स्किप') || btn.classList.contains('ytp-ad-skip-button-modern') || btn.classList.contains('ytp-ad-skip-button'))) {
                                            btn.click();
                                            return 'verified_skip_clicked';
                                        }
                                    }

                                    // 2. If Ad is active and no skip button, fast-forward ad video cleanly
                                    if (isAdShowing) {
                                        const adVideo = player.querySelector('video');
                                        if (adVideo && !isNaN(adVideo.duration) && adVideo.duration > 0 && adVideo.currentTime < adVideo.duration) {
                                            adVideo.muted = true;
                                            adVideo.currentTime = adVideo.duration;
                                            return 'ad_fastforwarded';
                                        }
                                    }
                                    return 'clean';
                                })()"
                            end if
                        end repeat
                    end repeat
                end tell
            end try
            """
            try:
                result = subprocess.run(["osascript", "-e", ad_script], capture_output=True, text=True, timeout=3.0)
                return {"success": True, "action": "SKIP_AD", "output": result.stdout.strip()}
            except Exception as e:
                return {"success": True, "action": "SKIP_AD", "error": str(e)}

        elif action == "TERMINAL_COMMAND":
            cmd = params.get("command", "")

        elif action == "SET_CLIPBOARD":
            text = params.get("text", "")
            process = subprocess.Popen("pbcopy", env={"LANG": "en_US.UTF-8"}, stdin=subprocess.PIPE)
            process.communicate(text.encode("utf-8"))
            return {"success": True, "text": text}

        elif action == "GET_CLIPBOARD":
            process = subprocess.Popen("pbpaste", env={"LANG": "en_US.UTF-8"}, stdout=subprocess.PIPE)
            stdout, _ = process.communicate()
            return {"success": True, "text": stdout.decode("utf-8", errors="ignore")}

        elif action == "DOWNLOAD_YOUTUBE":
            yt_url = params.get("url", "").strip()
            quality = str(params.get("quality", "1080p")).lower()
            if not yt_url:
                get_yt_script = """
                try
                    tell application "Google Chrome"
                        repeat with w in windows
                            repeat with t in tabs of w
                                if URL of t contains "youtube.com/watch" then
                                    return URL of t
                                end if
                            end repeat
                        end repeat
                    end tell
                end try
                try
                    tell application "Safari"
                        repeat with w in windows
                            repeat with t in tabs of w
                                if URL of t contains "youtube.com/watch" then
                                    return URL of t
                                end if
                            end repeat
                        end repeat
                    end tell
                end try
                return ""
                """
                try:
                    s_res = subprocess.run(["osascript", "-e", get_yt_script], capture_output=True, text=True, timeout=2.0)
                    active_u = s_res.stdout.strip()
                    if active_u:
                        yt_url = active_u
                except Exception:
                    pass

            if yt_url:
                if not hasattr(execute_mac_command, "_active_downloads"):
                    execute_mac_command._active_downloads = set()

                # Concurrency lock: prevent duplicate downloads of same video
                if yt_url in execute_mac_command._active_downloads:
                    print(f"[AADI DOWNLOAD] Already in progress for {yt_url}")
                    return {"success": True, "action": "DOWNLOAD_YOUTUBE", "url": yt_url, "quality": quality, "status": "already_in_progress"}

                execute_mac_command._active_downloads.add(yt_url)

                import threading
                def _bg_download(target_url: str, res_choice: str):
                    try:
                        downloads_dir = os.path.expanduser("~/Downloads")
                        py_bin = sys.executable or "python3"
                        # Robust multi-client runner to bypass YouTube SABR / bot-guard challenges
                        dl_runner = f'"{py_bin}" -m yt_dlp --extractor-args "youtube:player_client=android,ios,web"'
                        
                        print(f"[AADI DOWNLOAD] Starting native download: {target_url} ({res_choice})")

                        if res_choice in ("mp3", "audio"):
                            dl_cmd = f'{dl_runner} --no-playlist -x --audio-format mp3 -o "{downloads_dir}/%(title)s.%(ext)s" "{target_url}"'
                            ret = subprocess.run(dl_cmd, shell=True)
                            if ret.returncode != 0:
                                fallback_cmd = f'"{py_bin}" -m yt_dlp --extractor-args "youtube:player_client=android" -x --audio-format mp3 -o "{downloads_dir}/%(title)s.%(ext)s" "{target_url}"'
                                subprocess.run(fallback_cmd, shell=True)
                            print(f"[AADI DOWNLOAD] Finished MP3 download to ~/Downloads")
                            subprocess.run(["osascript", "-e", 'display notification "YouTube Audio downloaded to ~/Downloads" with title "AADI Downloader"'])
                            return

                        max_h = 1080
                        if "4320" in res_choice or "8k" in res_choice:
                            max_h = 4320
                        elif "2160" in res_choice or "4k" in res_choice:
                            max_h = 2160
                        elif "1440" in res_choice or "2k" in res_choice:
                            max_h = 1440
                        elif "720" in res_choice:
                            max_h = 720
                        elif "480" in res_choice:
                            max_h = 480

                        fmt = f"bestvideo[height<={max_h}]+bestaudio/best[height<={max_h}]/best/18"
                        dl_cmd = f'{dl_runner} --no-playlist -f "{fmt}" --merge-output-format mp4 -o "{downloads_dir}/%(title)s_{res_choice}.%(ext)s" "{target_url}"'
                        ret = subprocess.run(dl_cmd, shell=True)
                        if ret.returncode != 0:
                            fallback_cmd = f'"{py_bin}" -m yt_dlp --extractor-args "youtube:player_client=android" -o "{downloads_dir}/%(title)s.%(ext)s" "{target_url}"'
                            subprocess.run(fallback_cmd, shell=True)

                        print(f"[AADI DOWNLOAD] Finished {res_choice} video download to ~/Downloads")
                        subprocess.run(["osascript", "-e", f'display notification "Video downloaded to ~/Downloads" with title "AADI Downloader"'])
                    except Exception as err:
                        print(f"[AADI DOWNLOAD ERROR] {err}")
                    finally:
                        if hasattr(execute_mac_command, "_active_downloads") and target_url in execute_mac_command._active_downloads:
                            execute_mac_command._active_downloads.remove(target_url)

                thread = threading.Thread(target=_bg_download, args=(yt_url, quality), daemon=True)
                thread.start()
                return {"success": True, "action": "DOWNLOAD_YOUTUBE", "url": yt_url, "quality": quality, "status": "started"}

        else:
            return {"success": False, "error": f"Unknown action: {action}"}

        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        ret = {
            "success": result.returncode == 0,
            "output": result.stdout.strip(),
            "error": result.stderr.strip()
        }
        if "target_url" in locals():
            ret["url"] = target_url
        elif "url" in locals() and url:
            ret["url"] = url
        if "yt_res" in locals():
            ret["youtube"] = yt_res
        return ret
    except Exception as e:
        return {"success": False, "error": str(e)}

# System Telemetry via psutil & macOS pmset (1.0s fast cache for low latency)
_last_stats_time = 0.0
_last_stats_cache = {}

def get_system_stats() -> Dict[str, Any]:
    global _last_stats_time, _last_stats_cache
    now = time.time()
    if now - _last_stats_time < 1.0 and _last_stats_cache:
        return _last_stats_cache

    total_mem = psutil.virtual_memory().total
    used_mem = psutil.virtual_memory().used
    mem_usage = psutil.virtual_memory().percent
    cpu_usage = int(psutil.cpu_percent(interval=None)) or 18
    cpu_count = psutil.cpu_count()

    battery_percent = 100
    is_charging = True

    try:
        batt = psutil.sensors_battery()
        if batt:
            battery_percent = int(batt.percent)
            is_charging = batt.power_plugged
    except Exception:
        pass

    res = {
        "cpuModel": "Apple Silicon / Intel Core",
        "cpuCount": cpu_count,
        "cpuUsage": cpu_usage,
        "memUsage": int(mem_usage),
        "totalMemGB": f"{total_mem / (1024**3):.1f}",
        "usedMemGB": f"{used_mem / (1024**3):.1f}",
        "batteryPercent": battery_percent,
        "isCharging": is_charging,
        "uptimeSec": int(time.time() - psutil.boot_time()),
        "platform": sys.platform,
        "hostname": socket.gethostname()
    }
    _last_stats_cache = res
    _last_stats_time = now
    return res

# Live Weather Fetcher with Non-Blocking Background Refresh
cached_weather = {
    "city": "Delhi",
    "temp_C": "26",
    "desc": "Clear Skies & Mild Breeze",
    "humidity": "45",
    "windspeedKmph": "12",
    "timestamp": time.time()
}

def get_live_weather(city: str = "Delhi") -> Dict[str, Any]:
    global cached_weather
    now = time.time()
    if now - cached_weather.get("timestamp", 0) > 600:
        def _bg_fetch():
            global cached_weather
            try:
                url = f"https://wttr.in/{urllib.parse.quote(city)}?format=j1"
                req = urllib.request.Request(url, headers={"User-Agent": "curl/7.68.0"})
                with urllib.request.urlopen(req, timeout=2.0) as resp:
                    data = json.loads(resp.read().decode())
                    current = data["current_condition"][0]
                    cached_weather = {
                        "city": city,
                        "temp_C": current["temp_C"],
                        "desc": current["weatherDesc"][0]["value"],
                        "humidity": current["humidity"],
                        "windspeedKmph": current["windspeedKmph"],
                        "timestamp": time.time()
                    }
            except Exception:
                cached_weather["timestamp"] = time.time()
        threading.Thread(target=_bg_fetch, daemon=True).start()
    return cached_weather

# Active WebSocket Connections Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: Dict[str, Any]):
        msg = json.dumps(data)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(msg)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# REST Endpoints
@app.get("/api/info")
async def get_info(request: Request):
    local_ip = get_local_ip()
    protocol = "https" if (BASE_DIR / "cert.pem").exists() and (BASE_DIR / "key.pem").exists() else "http"
    mobile_url = f"{protocol}://{local_ip}:{PORT}"
    qr_code_data_url = generate_qr_code(mobile_url)
    stats = get_system_stats()
    weather = get_live_weather()

    return {
        "assistantName": config.get("assistantName", "J.A.R.V.I.S."),
        "userTitle": config.get("userTitle", "Sir"),
        "localIP": local_ip,
        "port": PORT,
        "protocol": protocol,
        "mobileURL": mobile_url,
        "qrCodeDataURL": qr_code_data_url,
        "stats": stats,
        "weather": weather,
        "config": config,
        "notesCount": len(load_notes())
    }

@app.get("/api/telemetry")
async def get_telemetry():
    return get_system_stats()

@app.get("/api/weather")
async def get_weather_endpoint(city: str = "Delhi"):
    return get_live_weather(city)

@app.get("/api/config")
async def get_config_endpoint():
    return config

@app.post("/api/config")
async def update_config_endpoint(request: Request):
    data = await request.json()
    save_config(data)
    await manager.broadcast({"type": "CONFIG_UPDATED", "payload": config})
    return {"success": True, "config": config}

# Notes API Endpoints
@app.get("/api/notes")
async def get_notes_endpoint():
    return load_notes()

@app.post("/api/notes")
async def add_note_endpoint(request: Request):
    data = await request.json()
    note_text = data.get("text", "").strip()
    if note_text:
        notes = load_notes()
        new_note = {
            "id": int(time.time() * 1000),
            "text": note_text,
            "created": time.strftime("%I:%M %p, %d %b")
        }
        notes.insert(0, new_note)
        save_notes(notes)
        await manager.broadcast({"type": "NOTES_UPDATED", "payload": notes})
        return {"success": True, "note": new_note, "notes": notes}
    return {"success": False, "error": "Empty note text"}

@app.delete("/api/notes/{note_id}")
async def delete_note_endpoint(note_id: int):
    notes = load_notes()
    notes = [n for n in notes if n["id"] != note_id]
    save_notes(notes)
    await manager.broadcast({"type": "NOTES_UPDATED", "payload": notes})
    return {"success": True, "notes": notes}

@app.delete("/api/notes")
async def clear_notes_endpoint():
    save_notes([])
    await manager.broadcast({"type": "NOTES_UPDATED", "payload": []})
    return {"success": True, "notes": []}

# Universal Clipboard Sync (Mac <-> Phone)
@app.get("/api/clipboard")
async def get_clipboard():
    res = execute_mac_command("GET_CLIPBOARD")
    return res

@app.post("/api/clipboard")
async def set_clipboard(request: Request):
    data = await request.json()
    res = execute_mac_command("SET_CLIPBOARD", data)
    await manager.broadcast({"type": "CLIPBOARD_SYNCED", "payload": data})
    return res

# Webhooks
@app.post("/api/webhook/trigger")
async def webhook_trigger(request: Request):
    data = await request.json()
    action = data.get("action")
    command = data.get("command", action)
    print(f"[AADI PYTHON WEBHOOK] {command}")

    result = None
    if action:
        result = execute_mac_command(action, data)
        # CRITICAL SAFEGUARD: Never echo DOWNLOAD_YOUTUBE / DOWNLOAD_VIDEO back as COMMAND broadcast!
        # Otherwise connected browser tabs receive it and re-trigger downloads in an infinite loop.
        if action not in ("DOWNLOAD_YOUTUBE", "DOWNLOAD_VIDEO"):
            await manager.broadcast({
                "type": "COMMAND",
                "payload": {
                    "action": action,
                    "params": data,
                    "timestamp": time.time()
                }
            })

    await manager.broadcast({
        "type": "WEBHOOK_EVENT",
        "payload": {
            "command": command,
            "params": data,
            "result": result,
            "timestamp": time.time()
        }
    })

    return {
        "status": "acknowledged",
        "assistant": config.get("assistantName", "AADI"),
        "message": f"Command executed: {command}",
        "result": result
    }

# YouTube Direct Video Resolver Endpoint
@app.get("/api/youtube/resolve")
async def resolve_youtube_endpoint(q: str = "trending"):
    return resolve_youtube_first_video(q)

@app.post("/api/speech-intent")
async def speech_intent(request: Request):
    data = await request.json()
    text = data.get("text", "")
    origin_client = data.get("originClientId")
    source_device = data.get("sourceDevice", "mobile-webhook")
    print(f"[JARVIS PYTHON INTENT] '{text}' from {source_device} ({origin_client})")

    await manager.broadcast({
        "type": "TRANSCRIPT",
        "payload": {
            "role": "user",
            "text": text,
            "source": source_device,
            "originClientId": origin_client,
            "sourceDevice": source_device
        }
    })

    return {"success": True, "understood": True, "received": text}

# =========================================================
# MULTIMODAL AUDIO VOICE ENGINE (INSTANT MOBILE & DESKTOP)
# =========================================================
def process_voice_audio_with_gemini(audio_bytes: bytes, mime_type: str = "audio/webm") -> Dict[str, Any]:
    key = config.get("geminiApiKey", "")
    if not key:
        user_title = config.get("userTitle", "Aditya")
        return {"success": False, "error": "gemini_key_missing", "reply": f"Ji {user_title}, main sun raha hoon. Kahiye kya karna hai?"}
    
    b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
    
    system_prompt = """You are Stark J.A.R.V.I.S. Artificial Intelligence Core.
Listen to the user's spoken audio carefully. It may be in Hindi, English, or Hinglish.
Understand their intent and return ONLY a JSON object with:
- "transcript": Exact words spoken by the user in original script or Romanized Hindi/English
- "action": One of ["PLAY_YOUTUBE", "MEDIA_NEXT", "MEDIA_PREV", "MEDIA_PAUSE", "MEDIA_RESUME", "MEDIA_SEEK", "SKIP_AD", "CLOSE_INACTIVE_YOUTUBE_TABS", "SET_VOLUME", "LOCK_SCREEN", "TAKE_SCREENSHOT", "OPEN_APP", "GENERAL_QUERY"]
- "params": Object with required parameters:
    - For PLAY_YOUTUBE: {"query": "exact song or video name"}
    - For SET_VOLUME: {"level": 0-100}
    - For MEDIA_SEEK: {"seconds": +/- seconds}
    - For OPEN_APP: {"appName": "app name"}
- "reply": Natural, respectful, concise Jarvis reply in Hindi or English (matching user language). If action is performed, acknowledge it cleanly (e.g. "Ji Sir, Arijit Singh ke gane play kar raha hu."). Do not mention neural network recordings or filler.
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={key}"
    payload = {
        "contents": [{
            "parts": [
                {"text": system_prompt},
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": b64_audio
                    }
                }
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(text)
            return {"success": True, **parsed}
    except Exception as e:
        print(f"[JARVIS AUDIO ERROR] {e}")
        return {"success": False, "error": str(e), "reply": "Maaf kijiye Sir, audio process karne me samasya aayi."}

@app.post("/api/voice-audio")
async def voice_audio_endpoint(request: Request):
    form = await request.form()
    audio_file = form.get("audio")
    origin_client = form.get("originClientId", "unknown")
    source_device = form.get("sourceDevice", "mobile-audio")

    if not audio_file:
        return {"success": False, "error": "no_audio_file"}

    content = await audio_file.read()
    mime_type = audio_file.content_type or "audio/webm"
    if ";" in mime_type:
        mime_type = mime_type.split(";")[0]

    print(f"[JARVIS VOICE AUDIO] Received {len(content)} bytes ({mime_type}) from {source_device}")

    # Process through Gemini Multi-modal Audio
    res = process_voice_audio_with_gemini(content, mime_type)

    if res.get("success"):
        transcript = res.get("transcript", "")
        action = res.get("action", "GENERAL_QUERY")
        params = res.get("params", {})
        reply = res.get("reply", "Ji Sir.")

        # Broadcast user transcript to all devices
        await manager.broadcast({
            "type": "TRANSCRIPT",
            "payload": {
                "role": "user",
                "text": transcript,
                "source": source_device,
                "originClientId": origin_client,
                "sourceDevice": source_device
            }
        })

        # Execute Mac Command if actionable
        exec_result = None
        if action and action != "GENERAL_QUERY":
            exec_result = execute_mac_command(action, params)
            await manager.broadcast({
                "type": "COMMAND",
                "payload": {
                    "action": action,
                    "params": params,
                    "timestamp": time.time()
                }
            })

        # Broadcast assistant voice reply
        await manager.broadcast({
            "type": "TRANSCRIPT",
            "payload": {
                "role": "jarvis",
                "text": reply,
                "action": action,
                "result": exec_result,
                "originClientId": origin_client,
                "sourceDevice": source_device
            }
        })

        return {
            "success": True,
            "transcript": transcript,
            "action": action,
            "params": params,
            "reply": reply,
            "result": exec_result
        }
    else:
        return res

# =========================================================
# HYBRID AI & CONTINUOUS SELF-TRAINING ENDPOINTS
# =========================================================
@app.post("/api/ai/query")
async def ai_query_endpoint(request: Request):
    data = await request.json()
    prompt = data.get("prompt", "").strip()
    is_hindi = data.get("isHindi", True)
    origin_client = data.get("originClientId")
    source_device = data.get("sourceDevice", "client")

    if not prompt:
        return {"success": False, "error": "Empty prompt"}

    user_title = config.get("userTitle", "Aditya")
    assistant_name = config.get("assistantName", "AADI")
    
    # Query AADI Autonomous Multi-Tier Intelligence Core
    result = query_aadi_intelligence(
        prompt=prompt,
        is_hindi=is_hindi,
        user_title=user_title,
        assistant_name=assistant_name
    )

    # If an action was identified, execute it on Mac
    action = result.get("action")
    action_params = result.get("actionParams", {})
    if action and config.get("macControlsEnabled", True):
        try:
            exec_res = execute_mac_command(action, action_params)
            result["actionResult"] = exec_res
        except Exception as e:
            result["actionError"] = str(e)

    # Broadcast to other displays silently
    await manager.broadcast({
        "type": "TRANSCRIPT",
        "payload": {
            "role": "jarvis",
            "text": result.get("reply", ""),
            "source": result.get("model", "aadi-intelligence"),
            "originClientId": origin_client,
            "sourceDevice": source_device
        }
    })

    return result

@app.get("/api/learned-intents")
async def get_learned_intents_endpoint():
    return load_learned_intents()

@app.delete("/api/learned-intents/{intent_id}")
async def delete_learned_intent_endpoint(intent_id: str):
    data = load_learned_intents()
    data["intents"] = [i for i in data.get("intents", []) if i.get("id") != intent_id]
    save_learned_intents(data)
    return {"success": True, "data": data}

@app.delete("/api/learned-intents")
async def clear_learned_intents_endpoint():
    data = {"version": "1.0.0", "lastUpdated": int(time.time()), "intents": []}
    save_learned_intents(data)
    return {"success": True, "data": data}

@app.post("/api/ai/test-key")
async def test_gemini_key_endpoint(request: Request):
    data = await request.json()
    key = data.get("apiKey", "").strip()
    if not key:
        return {"success": False, "error": "API Key cannot be empty"}

    res = query_gemini_ai(prompt="Ping test. Respond with 'Online'.", is_hindi=False, api_key=key)
    return res

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    local_ip = get_local_ip()

    await websocket.send_text(json.dumps({
        "type": "INIT",
        "payload": {
            "config": config,
            "notes": load_notes(),
            "stats": get_system_stats(),
            "weather": get_live_weather(),
            "serverTime": time.time(),
            "localIP": local_ip,
            "port": PORT
        }
    }))

    try:
        while True:
            text_data = await websocket.receive_text()
            data = json.loads(text_data)
            msg_type = data.get("type")
            payload = data.get("payload", {})

            if msg_type == "VOICE_COMMAND":
                print(f"[JARVIS VOICE] '{payload.get('text')}' (Device: {payload.get('sourceDevice')}, Client: {payload.get('originClientId')})")
                await manager.broadcast({
                    "type": "TRANSCRIPT",
                    "payload": {
                        "role": "user",
                        "text": payload.get("text"),
                        "source": payload.get("source"),
                        "originClientId": payload.get("originClientId"),
                        "sourceDevice": payload.get("sourceDevice")
                    }
                })

            elif msg_type == "MAC_COMMAND":
                action = payload.get("action")
                params = payload.get("params", {})
                res = execute_mac_command(action, params)
                await manager.broadcast({
                    "type": "COMMAND_RESULT",
                    "payload": {
                        "action": action,
                        "result": res,
                        "timestamp": time.time(),
                        "originClientId": payload.get("originClientId"),
                        "sourceDevice": payload.get("sourceDevice")
                    }
                })

            elif msg_type == "ADD_NOTE":
                notes = load_notes()
                new_note = {
                    "id": int(time.time() * 1000),
                    "text": payload.get("text", ""),
                    "created": time.strftime("%I:%M %p, %d %b")
                }
                notes.insert(0, new_note)
                save_notes(notes)
                await manager.broadcast({"type": "NOTES_UPDATED", "payload": notes})

            elif msg_type == "UPDATE_CONFIG":
                save_config(payload)
                await manager.broadcast({"type": "CONFIG_UPDATED", "payload": config})

            elif msg_type == "TRIGGER_SENTRY_ALARM":
                await manager.broadcast({"type": "SENTRY_ALERT", "payload": {"time": time.time()}})

            elif msg_type == "PING":
                await websocket.send_text(json.dumps({"type": "PONG", "time": time.time()}))

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"[JARVIS WS ERROR] {e}")
        manager.disconnect(websocket)

# Mount Frontend Static Assets
if PUBLIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="public")

if __name__ == "__main__":
    local_ip = get_local_ip()
    cert_path = BASE_DIR / "cert.pem"
    key_path = BASE_DIR / "key.pem"
    has_ssl = cert_path.exists() and key_path.exists()
    proto = "https" if has_ssl else "http"

    print("\n" + "=" * 54)
    print(f"🦾 {config.get('assistantName', 'J.A.R.V.I.S.').upper()} PYTHON CORE v3.0 INITIALIZED ({proto.upper()})")
    print(f"🖥️  Mac Desktop HUD:    {proto}://localhost:{PORT}")
    print(f"📱  Mobile Phone Access: {proto}://{local_ip}:{PORT}")
    print("=" * 54 + "\n")

    if has_ssl:
        uvicorn.run(
            "server:app",
            host="0.0.0.0",
            port=PORT,
            ssl_keyfile=str(key_path),
            ssl_certfile=str(cert_path),
            reload=False
        )
    else:
        uvicorn.run("server:app", host="0.0.0.0", port=PORT, reload=False)

