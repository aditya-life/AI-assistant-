# 🦾 AADI YouTube Sentinel & Media Bridge v2.1

> **Autonomous 0.01ms YouTube Ad Neutralizer, Auto 4K/HD Resolution Enforcer, Any-Resolution Video Downloader & AADI Media Bridge**  
> *Fully Cross-Browser Compatible: Apple Safari & Google Chrome*

---

## 🚀 What's New in v2.1 (Fixes & Major Upgrades)

### 1. 📥 Video Download Matrix (Any Resolution & MP3)
- **High-Speed Native Downloads via Mac `yt-dlp`**: Download any YouTube video in **4K UHD (2160p)**, **2K QHD (1440p)**, **1080p FHD (60fps)**, **720p HD**, **480p SD**, or extract **MP3 Audio** with 1 click directly to `~/Downloads`!
- **Standalone Web Fallback**: If the local AADI Python server is closed, automatically opens direct stream download portals without hassle.

---

### 2. ⚙️ Permanent Fix for Settings Menu & Safari NotFoundError
- **Bug Solved**: Completely resolved `NotFoundError: The object can not be found here.` in Safari WebKit via `safelyInsertHUDButton()` DOM tree-walking.
- **Settings Interactivity Guard**: Added capture-phase click locking (`settingsMenuLocked`). When you click YouTube's native Settings gear, all dismissal actions pause for 15s so settings never collapses.

---

### 3. 🎛️ Convenient Ways to Change Resolution
1. **YouTube Native Gear Menu**: Opens completely unhindered and smoothly.
2. **On-Player AADI Quick HUD**: Elegant `⚡ 1080p ▼` badge embedded directly into the YouTube player control bar for 1-click resolution switching and instant download.
3. **Extension Popup UI**: Cyber HUD popup to set preferred auto-resolution across all videos.
4. **WebSocket Voice / Remote Command**: AADI Assistant can remotely dispatch `SET_RESOLUTION` or `DOWNLOAD_YOUTUBE`.

---

### 4. ⚡ Advanced Features
- **Auto-Enforce 4K/HD Quality**: Videos automatically stream in your preferred quality without manual switching.
- **Ultra-Fast Ad Neutralization**: Instantly fast-forwards and auto-skips unskippable and skippable ads in 0.01ms.
- **Audio Booster (100% - 300%)**: Amplify soft YouTube videos directly from the extension popup using the Web Audio API.
- **HD Frame Screenshot**: Capture full-resolution video frames cleanly with one click.
- **Picture-in-Picture (PiP)**: Native picture-in-picture support for Safari and Chrome.
- **AADI Central WebSocket Bridge**: Bi-directional communication with local AADI Core server (`server.py` / `server.js`).

---

## 🍎 Safari Setup Guide (हिंदी & English)

### Safari me kaise install aur use karein:

1. **Safari Preferences / Settings Kholein**:
   - Safari menu bar me **Safari > Settings...** (ya `Cmd + ,`) par click karein.
   - **Advanced** tab me jayein aur **"Show features for web developers"** ko tick karein.

2. **Develop Menu me Unsigned Extensions Allow karein**:
   - Safari ke top menu bar me **Develop** par click karein.
   - **"Allow Unsigned Extensions"** par tick karein.

3. **Extension Load karein**:
   - Safari ke Extensions preferences me jakar **AADI Sentinel** extension ko toggle OFF karke ON karein (ya reload karein) aur `youtube.com` ke liye **"Always Allow on This Website"** select karein.

4. **YouTube Open karein**:
   - Ab Gear Settings bina ruke khulega, `⚡ [Quality] ▼` HUD button dikhega, aur Popup me direct 4K/1080p/MP3 Video Download option milega!

---

## 🛠️ File Structure

```
chrome-extension/
├── manifest.json      # Manifest V3 (Cross-browser compatible)
├── content.js         # Safe ad neutralizer, HUD injector, video downloader
├── inject.js          # Main-world player API bridge (direct quality control)
├── styles.css         # Ad banner erasers & futuristic HUD UI styling
├── popup.html         # AADI Cyberpunk Arc Reactor popup interface
├── popup.css          # Dark neon glassmorphic styling
├── popup.js           # Popup controller & tab synchronization
├── icons/             # 16px, 32px, 48px, 128px Arc Reactor icons
└── README.md          # Complete documentation & Safari setup guide
```
