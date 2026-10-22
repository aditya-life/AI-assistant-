# 🦾 J.A.R.V.I.S. YouTube Sentinel & Media Bridge v2.0

> **Autonomous 0.01ms YouTube Ad Neutralizer, Auto 4K/HD Resolution Enforcer & Stark Media Bridge**  
> *Fully Cross-Browser Compatible: Apple Safari & Google Chrome*

---

## 🚀 What's New in v2.0 (Fixes & Major Upgrades)

### 1. ⚙️ Fix for Settings Menu Blocking (Resolution Change Bug)
- **Problem Solved**: Earlier, whenever the YouTube Settings (gear icon) was clicked in Safari or Chrome, the menu would instantly disappear or refuse to open, preventing resolution/quality changes.
- **Root Cause**: The script had an unconstrained `document.querySelectorAll('ytd-popup-container #dismiss-button')` firing on every DOM mutation and every 50ms. YouTube renders hidden dialogs inside `ytd-popup-container`; clicking this button triggered an outside-click event that immediately closed the video player settings popup.
- **Solution**:
  - Implemented `isPlayerMenuOpen()` check: If the player settings menu or any panel is open or focused, all popup dismissal actions are completely paused.
  - Eliminated generic `#dismiss-button` querying: Replaced with precise, target-specific handlers that only trigger on genuinely visible "Still watching?" prompts and adblock enforcement dialogs.
  - Throttled DOM mutations with `requestAnimationFrame` and safely scoped observation to reduce CPU load in Safari.

---

### 2. 🎛️ 4 Convenient Ways to Change Resolution
1. **YouTube Native Gear Menu**: The native YouTube settings menu now opens completely smoothly without any interruptions.
2. **On-Player J.A.R.V.I.S. Quick HUD**: An elegant `⚡ 1080p ▼` badge is embedded directly into the YouTube player controls right next to the gear icon. Click it to choose `8K`, `4K`, `1440p`, `1080p`, `720p`, `480p`, or `Auto` in 1 click!
3. **Extension Popup UI**: Click the J.A.R.V.I.S. Arc Reactor icon in the Safari/Chrome toolbar to set your default preferred resolution (Auto-Enforces on every video!).
4. **WebSocket Voice / Remote Command**: Stark J.A.R.V.I.S. assistant can remotely dispatch `SET_RESOLUTION` (e.g., `4k`, `1080p`).

---

### 3. ⚡ Advanced Features Included
- **Auto-Enforce 4K/HD Quality**: Videos automatically stream in your preferred quality without needing to change it manually every time.
- **Ultra-Fast Ad Neutralization**: Instantly fast-forwards and auto-skips unskippable and skippable ads in 0.01ms, auto-restoring volume and playback speed when normal video resumes.
- **Audio Booster (100% - 300%)**: Amplify soft YouTube videos directly from the extension popup using the Web Audio API.
- **HD Frame Screenshot**: Capture full-resolution video frames cleanly with one click.
- **Picture-in-Picture (PiP)**: Native picture-in-picture support for Safari and Chrome.
- **Stark Central WebSocket Bridge**: Bi-directional communication with local J.A.R.V.I.S. Core server (`server.py` / `server.js`).

---

## 🍎 Safari Setup Guide (हिंदी & English)

### Safari me kaise install aur use karein:

1. **Safari Preferences / Settings Kholein**:
   - Safari menu bar me **Safari > Settings...** (ya `Cmd + ,`) par click karein.
   - **Advanced** tab me jayein aur **"Show features for web developers"** (ya purane macOS me *"Show Develop menu in menu bar"*) ko tick karein.

2. **Develop Menu me Unsigned Extensions Allow karein**:
   - Safari ke top menu bar me **Develop** par click karein.
   - **"Allow Unsigned Extensions"** par tick karein (agar password maange toh apna Mac password daalein).

3. **Extension Load karein**:
   - **Option A (Xcode Converter - Recommended)**:
     Terminal me command chalayein:
     ```bash
     xcrun safari-web-extension-converter /Users/aditya/github-projects/AI-assistant-/chrome-extension --project-location ~/Desktop
     ```
     Xcode project generate hoga, usse Xcode me open karke **Run (Cmd + R)** dabayein.
   - **Option B (Safari Developer Mode)**:
     Safari ke Extensions preferences me jakar J.A.R.V.I.S. extension enable karein aur `youtube.com` ke liye **"Always Allow on This Website"** select karein.

4. **Safari Refresh karein**:
   - YouTube open karein: Ab Settings gear button perfectly open hoga aur player ke control bar me `⚡ [Quality] ▼` HUD button bhi dikhai dega!

---

## 🌐 Chrome / Brave / Edge Setup Guide

1. Chrome me `chrome://extensions` open karein.
2. Top-right corner me **Developer mode** toggle ON karein.
3. **Load unpacked** par click karein aur `AI-assistant-/chrome-extension` folder select karein.
4. YouTube open karein aur enjoy karein!

---

## 🛠️ File Structure

```
chrome-extension/
├── manifest.json      # Manifest V3 (Cross-browser compatible)
├── content.js         # Safe ad neutralizer, HUD injector, WebSocket bridge
├── inject.js          # Main-world player API bridge (direct quality control)
├── styles.css         # Ad banner erasers & futuristic HUD UI styling
├── popup.html         # Stark Cyberpunk Arc Reactor popup interface
├── popup.css          # Dark neon glassmorphic styling
├── popup.js           # Popup controller & tab synchronization
├── icons/             # 16px, 32px, 48px, 128px Arc Reactor icons
└── README.md          # Complete documentation & Safari setup guide
```
