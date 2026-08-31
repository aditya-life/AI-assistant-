# 🏍️ Android Phone Lock-Screen & Bike Mode Setup Guide

Yeh guide follow karke aapka Android phone **pocket me lock hone ke bawajood** earphones se saare voice commands (Calls, WhatsApp, Spotify, Maps) execute karega!

---

### 🎧 Step 1: Bluetooth Earphones se Lock-Screen Voice Active Karna

1. Apne phone ki **Settings** open karein.
2. **Google** > **Settings for Google apps** > **Search, Assistant & Voice** me jayein.
3. **Google Assistant** par tap karein:
   - **Lock Screen** option me jayein aur **"Assistant responses on lock screen"** ko **ON** karein.
   - **"Personal results on lock screen"** ko **ON** karein (Isse bina phone unlock kiye contacts ko call lag sakegi aur WhatsApp bhej sakega).
4. **Voice** settings me:
   - **"Bluetooth audio recording / Allow Bluetooth requests with device locked"** ko **ON** karein.

> **Result:** Ab jab aap bike par hon aur kaan me earphones hon, earphones ka button 1 baar tap karne par ya *"Hey Google / Jarvis"* bolne par bina phone nikale pocket se direct call lagegi aur gaane bajenge!

---

### 📲 Step 2: Mac JARVIS se Phone Connect Karna (Zero Download)

1. Mac terminal me project start karein:
   ```bash
   cd ~/Desktop/jarvis-assistant
   npm start
   ```
2. Mac browser me `http://localhost:3000` open hoga.
3. Top header me **"PHONE SYNC"** button tap karein -> Ek **Futuristic QR Code** aayega.
4. Apne Android phone ke camera se QR Code scan karein.
5. Phone ke Chrome browser me JARVIS open ho jayega!
6. Chrome menu (3 dots) par tap karke **"Add to Home screen"** select karein.
7. Ab aapke phone par **J.A.R.V.I.S.** ka icon ban jayega jo bilkul full-screen native app ki tarah open hoga!

---

### ⚡ Step 3: Useful Voice Commands (Hindi & English)

| Command | Action |
| :--- | :--- |
| **"YouTube par Arijit Singh gana chalao"** | YouTube Vanced / App me direct video start karega (Screen lock par bhi chalega) |
| **"Ad skip karo"** / **"Add skip karo"** | YouTube active video ad ko skip/fast-forward karega |
| **"Thoda dheere bolo"** / **"Thoda fast bolo"** | Hindi speech speed ko aaramdayak adjust karega |
| **"Spotify par Arijit Singh play karo"** | Spotify open karke music queue karega aur volume adjust karne ka option dega |
| **"Maps par nearest petrol pump search karo"** | Google Maps open karke live route navigation show karega |
| **"WhatsApp par Rahul ko message bhejo"** | WhatsApp direct chat box ready karega |
| **"Call Rahul / Call Emergency"** | Direct cellular call dial karega |
| **"Volume 70% karo"** / **"Mute Mac"** | Volume master adjust karega |
| **"Lock Mac"** / **"Take a screenshot"** | Mac screen lock karega aur desktop par screenshot save karega |
| **"Good Morning"** | Stark Protocol 01 run karke weather, battery aur workspace ready karega |
| **"Activate Sentry Mode"** | Intruder surveillance active karega |

---

### 📱 Step 4: YouTube Vanced / Screen-Off Background Audio Play
1. Agar aapke Android phone me **YouTube Vanced** ya **YouTube ReVanced** installed hai:
2. Phone settings me **Apps > Default Apps > Opening Links > YouTube Vanced** ko **"Open supported links"** par set karein.
3. Ab jab bhi aap Jarvis se kahenge *"YouTube par gana chalao"* ya *"Phone me video chalao"*, ye direct **YouTube Vanced** me deep-link (`vnd.youtube:ID`) launch karega.
4. **Fayda:** Phone screen **off/locked hone ke bawajood background me bina ruke gaana bajta rahega**, ads automatically block/skip honge, aur battery bilkul kam consume hogi!

---

### ⚙️ Step 5: Assistant ka Custom Name Badalna
HUD screen par **Settings (Gear Icon)** par tap karke aap:
* Assistant Name (e.g. *V.E.D.A., F.R.I.D.A.Y., A.R.I.A., K.A.A.L.*)
* User Title (*Sir, Boss, Aditya*)
* Voice Pitch, Speed, aur HUD Theme (Cyan, Gold, Emerald, Stealth)
apni marzi se customize kar sakte hain!
