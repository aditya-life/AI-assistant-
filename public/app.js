// =========================================================
// J.A.R.V.I.S. // STARK INDUSTRIES HYBRID OS CORE (v3.2.0)
// Complete 8-Level System Implementation with Advanced Hindi &
// Mobile Device-Routing, YouTube Direct Play & Voice Speed Control
// =========================================================

class JarvisCore {
  constructor() {
    this.clientId = 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.deviceType = this.isMobile ? 'mobile' : 'desktop';

    this.currentLanguage = localStorage.getItem('jarvis_lang') || 'hi-IN';

    this.config = {
      assistantName: 'J.A.R.V.I.S.',
      userTitle: 'Aditya',
      language: this.currentLanguage,
      theme: 'theme-cyan',
      voicePitch: 1.0,
      voiceRate: 1.0,
      hindiVoiceRate: 0.85,
      voiceGender: 'male',
      autoFollowUp: true,
      wakeWord: 'jarvis',
      emergencyContact: '+919876543210'
    };

    this.ws = null;
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.continuousMode = !this.isMobile;
    this.isSpeaking = false;
    this.awaitingFollowUp = false;
    this.lastIntent = null;
    this.wakeLock = null;
    this.cameraStream = null;
    this.notes = [];

    // Canvas & Audio Visualizer
    this.canvas = document.getElementById('arcCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.rotationAngle = 0;
    this.pulseScale = 1.0;
    this.audioLevel = 0;
    this.dpr = window.devicePixelRatio || 1;
    this.analyser = null;
    this.frequencyData = null;
    this.voices = [];
    this.learnedIntents = [];

    this.init();
  }

  async init() {
    console.log(`[JARVIS] Initializing Core Systems v3.2.0 (Device: ${this.deviceType}, Client: ${this.clientId})...`);
    this.initVoiceLoader();
    this.initClock();
    this.initServiceWorker();
    this.initWebSocket();
    this.initSpeechRecognition();
    this.initMicrophoneAnalyser();
    this.initArcReactorCanvas();
    this.bindEvents();
    this.fetchSystemInfo();
    setInterval(() => this.fetchSystemInfo(), 2500);
    this.fetchNotes();
    this.fetchLearnedIntents();
    this.requestWakeLock();
    this.updateLanguageUI();

    window.addEventListener('orientationchange', () => {
      if (this.initArcReactorCanvas) this.initArcReactorCanvas();
    }, { passive: true });

    // Mobile gesture unlock
    const unlockAudio = () => {
      if (window.audioFX) window.audioFX.init();
      if (this.synthesis && this.synthesis.resume) this.synthesis.resume();
    };
    ['touchstart', 'touchend', 'click'].forEach(e => {
      document.body.addEventListener(e, unlockAudio, { once: true, passive: true });
    });
  }

  initVoiceLoader() {
    if (this.synthesis) {
      this.voices = this.synthesis.getVoices() || [];
      if (this.synthesis.onvoiceschanged !== undefined) {
        this.synthesis.onvoiceschanged = () => {
          this.voices = this.synthesis.getVoices() || [];
          console.log(`[JARVIS AUDIO] ${this.voices.length} Speech voices pre-loaded.`);
        };
      }
    }
  }

  initServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('[JARVIS PWA] Service Worker active:', reg.scope))
        .catch((err) => console.warn('[JARVIS PWA] SW registration failed:', err));
    }
  }

  triggerHaptic(pattern = [25, 40, 25]) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  initClock() {
    const clockEl = document.getElementById('starkClock');
    const dateEl = document.getElementById('starkDate');

    setInterval(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');

      if (clockEl) clockEl.textContent = `${hours}:${mins}:${secs}.${ms}`;
      if (dateEl) {
        dateEl.textContent = `STARK LABS // ${now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}`;
      }
    }, 40);
  }

  async initMicrophoneAnalyser() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        this.analyser = audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        source.connect(this.analyser);
        console.log('[JARVIS AUDIO] Live Microphone Oscilloscope Linked (AEC & Noise-Suppression Active).');
      }
    } catch (err) {
      console.warn('[JARVIS AUDIO] Microphone analyser waiting for user gesture.');
    }
  }

  // WebSocket Connection
  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
      this.ws = new WebSocket(`${protocol}//${window.location.host}`);
    }

    this.ws.onopen = () => {
      console.log('[JARVIS] WebSocket Link Established.');
      this.updateNetworkBadge(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerMessage(data);
      } catch (err) {
        console.error('[JARVIS] WebSocket parse error:', err);
      }
    };

    this.ws.onclose = () => {
      console.warn('[JARVIS] WebSocket Link Dropped. Reconnecting in 3s...');
      this.updateNetworkBadge(false);
      setTimeout(() => this.initWebSocket(), 3000);
    };
  }

  handleServerMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case 'INIT':
        if (payload.config) this.applyConfig(payload.config);
        if (payload.notes) this.renderNotes(payload.notes);
        if (payload.weather) this.renderWeather(payload.weather);
        if (payload.stats) this.fetchSystemInfo();
        break;

      case 'TRANSCRIPT':
        const isSelf = payload.originClientId === this.clientId;
        const speakerName = payload.role === 'user'
          ? (payload.sourceDevice === 'mobile' ? 'Mobile Phone' : 'Mac Workstation')
          : this.config.assistantName;

        this.appendTranscript(speakerName, payload.text, payload.role);

        // Bi-Directional Voice Sync: If Jarvis answered, speak aloud on Mac (or initiating mobile)
        if (payload.role === 'jarvis' && payload.text) {
          if (!this.isMobile || isSelf) {
            this.speak(payload.text, null, this.isHindiInput(payload.text));
          }
        }
        break;

      case 'COMMAND_RESULT':
        // Only trigger sound/haptic if this client initiated it
        if (payload.originClientId === this.clientId || !payload.originClientId) {
          window.audioFX.playSuccess();
          this.triggerHaptic([30, 60]);
        }
        break;

      case 'NOTES_UPDATED':
        this.renderNotes(payload);
        break;

      case 'CONFIG_UPDATED':
        this.applyConfig(payload);
        break;

      case 'SENTRY_ALERT':
        this.triggerSentryAlarm();
        break;
    }
  }

  // =========================================================
  // LANGUAGE & SPEECH RECOGNITION (STT) - Dual-Engine Support
  // =========================================================
  toggleLanguage() {
    if (this.currentLanguage.startsWith('hi')) {
      this.currentLanguage = 'en-US';
    } else {
      this.currentLanguage = 'hi-IN';
    }
    localStorage.setItem('jarvis_lang', this.currentLanguage);
    this.config.language = this.currentLanguage;
    this.updateLanguageUI();

    if (this.recognition) {
      this.recognition.lang = this.currentLanguage;
      if (this.isListening) {
        this.recognition.stop();
        setTimeout(() => this.startListeningSafely(), 300);
      }
    }

    const title = this.config.userTitle || 'Sir';
    if (this.currentLanguage === 'hi-IN') {
      this.speak(`Ji bilkul ${title}, ab main Hindi bhasha aur Hinglish dono me baat karunga. Kahiye, main aapki kya madad karoon?`, null, true);
    } else {
      this.speak(`Language set to English, ${title}. Ready to assist at your command.`, null, false);
    }
    this.saveConfigToServer({ language: this.currentLanguage });
  }

  updateLanguageUI() {
    const langBadge = document.getElementById('langBadge');
    if (langBadge) {
      langBadge.textContent = this.currentLanguage.startsWith('hi') ? '🇮🇳 HI' : '🇬🇧 EN';
    }
    const select = document.getElementById('cfgVoiceLang');
    if (select) {
      select.value = this.currentLanguage;
    }
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[JARVIS] SpeechRecognition API not supported.');
      this.updateVoiceStatus('MIC NOT SUPPORTED');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.currentLanguage || 'hi-IN';
    this.isStartingRecognition = false;
    this.speechBuffer = '';
    this.lastInterimTranscript = '';
    this.speechDebounceTimer = null;

    const commitSpokenSentence = () => {
      if (this.speechDebounceTimer) {
        clearTimeout(this.speechDebounceTimer);
        this.speechDebounceTimer = null;
      }
      const pending = (this.speechBuffer + ' ' + (this.lastInterimTranscript || '')).trim();
      this.speechBuffer = '';
      this.lastInterimTranscript = '';
      if (pending && pending.length > 1) {
        console.log(`[AADI HEARD on ${this.deviceType}]`, pending);
        window.audioFX.playWake();
        this.triggerHaptic([40]);
        this.audioLevel = 1.0;
        this.handleUserInput(pending);
      }
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      this.isStartingRecognition = false;
      this.speechBuffer = '';
      this.lastInterimTranscript = '';
      this.updateVoiceStatus('LISTENING... SPEAK NOW 🎙️');
      const micBtn = document.getElementById('btnMicTrigger');
      if (micBtn) micBtn.classList.add('listening');
      // Proactively duck loud background media on workstation so user voice is crystal clear
      if (!this.isSpeaking) {
        this.sendMacCommand('DUCK_AUDIO');
      }
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      let finals = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finals += item[0].transcript + ' ';
        } else {
          interim += item[0].transcript;
        }
      }

      if (finals) {
        this.speechBuffer += finals;
      }
      this.lastInterimTranscript = interim;

      const displayLive = (this.speechBuffer + interim).trim();
      if (displayLive) {
        this.updateVoiceStatus(`🎙️ "${displayLive}"`);
      }

      // 1200ms natural conversational pause debouncer (ChatGPT Voice style)
      if (this.speechDebounceTimer) clearTimeout(this.speechDebounceTimer);
      this.speechDebounceTimer = setTimeout(commitSpokenSentence, 1200);
    };

    this.recognition.onspeechend = () => {
      if (this.speechDebounceTimer) {
        clearTimeout(this.speechDebounceTimer);
        this.speechDebounceTimer = setTimeout(commitSpokenSentence, 850);
      }
    };

    this.recognition.onerror = (event) => {
      this.isStartingRecognition = false;
      console.warn('[AADI] Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        this.updateVoiceStatus('MIC BLOCKED: ALLOW PERMISSION');
      } else if (event.error === 'no-speech') {
        this.updateVoiceStatus('READY // TAP MIC');
      }
      if (!this.isSpeaking) {
        this.sendMacCommand('UNDUCK_AUDIO');
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.isStartingRecognition = false;
      const micBtn = document.getElementById('btnMicTrigger');
      if (micBtn) micBtn.classList.remove('listening');

      // Commit any pending buffer on recognition end
      if (this.speechBuffer.trim() || (this.lastInterimTranscript && this.lastInterimTranscript.trim())) {
        commitSpokenSentence();
      }

      // Auto-restart if continuous mode OR proactive follow-up is awaiting user answer
      if ((this.continuousMode || this.awaitingFollowUp) && !this.isSpeaking) {
        setTimeout(() => {
          this.startListeningSafely();
        }, 300);
      } else {
        this.updateVoiceStatus('STANDBY // TAP MIC');
        if (!this.isSpeaking) {
          this.sendMacCommand('UNDUCK_AUDIO');
        }
      }
    };

    // Background Tab Persistence: Keep speech recognition active across tab switches
    document.addEventListener('visibilitychange', () => {
      if ((this.continuousMode || this.awaitingFollowUp) && !this.isSpeaking && !this.isListening) {
        setTimeout(() => this.startListeningSafely(), 150);
      }
    });
    window.addEventListener('focus', () => {
      if ((this.continuousMode || this.awaitingFollowUp) && !this.isSpeaking && !this.isListening) {
        setTimeout(() => this.startListeningSafely(), 150);
      }
    });

    if (!this.isMobile) {
      this.startListeningSafely();
    }
  }

  async startAudioRecording() {
    try {
      if (this.isRecordingAudio) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      this.mediaStream = stream;
      this.audioChunks = [];
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm');
      
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.isRecordingAudio = true;
      this.updateVoiceStatus('RECORDING... SPEAK NOW 🎙️');
      const micBtn = document.getElementById('btnMicTrigger');
      if (micBtn) micBtn.classList.add('listening');
      this.sendMacCommand('DUCK_AUDIO');

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        this.isRecordingAudio = false;
        if (micBtn) micBtn.classList.remove('listening');
        this.updateVoiceStatus('ANALYZING NEURAL AUDIO... 🧠');
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach(t => t.stop());
        }

        if (this.audioChunks.length === 0) {
          this.updateVoiceStatus('STANDBY // TAP MIC');
          this.sendMacCommand('UNDUCK_AUDIO');
          return;
        }

        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('originClientId', this.clientId);
        formData.append('sourceDevice', this.deviceType);

        try {
          const resp = await fetch('/api/voice-audio', {
            method: 'POST',
            body: formData
          });
          const result = await resp.json();
          if (result.success) {
            this.appendTranscript('You', result.transcript, 'user');
            this.updateVoiceStatus('RESPONSE READY');
            this.speak(result.reply, null, this.isHindiInput(result.transcript));
          } else {
            this.updateVoiceStatus('READY // TAP MIC');
            this.sendMacCommand('UNDUCK_AUDIO');
          }
        } catch (err) {
          console.warn('[JARVIS AUDIO UPLOAD ERROR]', err);
          this.updateVoiceStatus('READY // TAP MIC');
          this.sendMacCommand('UNDUCK_AUDIO');
        }
      };

      this.mediaRecorder.start(100);

      // Auto-stop recording after 6 seconds max
      if (this.recordingTimer) clearTimeout(this.recordingTimer);
      this.recordingTimer = setTimeout(() => {
        if (this.isRecordingAudio) {
          this.stopAudioRecording();
        }
      }, 6000);

    } catch (e) {
      console.warn('[JARVIS MEDIA RECORDER ERROR]', e);
      this.isRecordingAudio = false;
      this.updateVoiceStatus('MIC ACCESS REQUIRED');
    }
  }

  stopAudioRecording() {
    if (this.recordingTimer) clearTimeout(this.recordingTimer);
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    this.isRecordingAudio = false;
  }

  async unlockMobileAudioAndMic() {
    try {
      if (window.audioFX) {
        window.audioFX.init();
      }
      if (this.synthesis) {
        if (this.synthesis.paused) this.synthesis.resume();
        const silent = new SpeechSynthesisUtterance(' ');
        silent.volume = 0.01;
        this.synthesis.speak(silent);
      }
    } catch (e) {
      console.warn('[AADI AUDIO UNLOCK]', e);
    }
  }

  normalizeUserInput(raw) {
    if (!raw) return '';
    let s = raw.toLowerCase().trim();
    // Multi-script & phonetic normalizations
    s = s.replace(/\bu\s*tube\b|\byou\s*tube\b/g, 'youtube')
         .replace(/\bv\s*s\s*code\b|\bvs\s*code\b|\bwe\s*es\s*code\b/g, 'vs code')
         .replace(/\bchala\s*de\b|\bchalao\s*na\b|\bchalau\b|\bchalo\b/g, 'chalao')
         .replace(/\bbaja\s*de\b|\bbajao\s*na\b|\bbajau\b/g, 'bajao')
         .replace(/\bsuna\s*de\b|\bsunao\s*na\b|\bsunau\b/g, 'sunao')
         .replace(/\bgaana\b|\bgana\b|\bgeet\b/g, 'gaana')
         .replace(/\baawaz\b|\bawaz\b|\bsound\b/g, 'volume');
    return s;
  }

  startListeningSafely() {
    if (!this.recognition || this.isListening || this.isStartingRecognition || this.isSpeaking) return;
    try {
      this.isStartingRecognition = true;
      this.recognition.start();
    } catch (e) {
      this.isStartingRecognition = false;
      if (e.name === 'InvalidStateError') {
        this.isListening = true;
      }
    }
  }

  handleUserInput(text) {
    this.appendTranscript('You', text, 'user');

    // Transmit to server with originClientId & deviceType
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'VOICE_COMMAND',
          payload: {
            text,
            source: 'voice',
            originClientId: this.clientId,
            sourceDevice: this.deviceType
          }
        }));
      } catch (e) {}
    } else {
      fetch('/api/speech-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          source: 'mobile-client',
          originClientId: this.clientId,
          sourceDevice: this.deviceType
        })
      }).catch(() => {});
    }

    // Process locally and speak response ONLY ON THIS ORIGINATING DEVICE
    this.processNaturalLanguage(text);
  }

  // =========================================================
  // UNIVERSAL MULTI-SCRIPT BILINGUAL INTENT PARSER
  // Supports: English, Roman Hinglish & Devanagari Hindi
  // =========================================================
  isHindiInput(text) {
    const hindiKeywords = [
      // 1. Pronouns, Subjects & Addressing
      'hai', 'hain', 'ho', 'hona', 'tha', 'thi', 'the', 'main', 'mai', 'mera', 'meri', 'mere', 'mujhe', 'mujhko', 'apna', 'apni', 'apne',
      'hum', 'ham', 'hamara', 'hamari', 'hamare', 'hume', 'humko', 'tum', 'tera', 'teri', 'tere', 'tujhe', 'tujhko', 'tumhe', 'tumko',
      'tumhara', 'tumhari', 'tumhare', 'aap', 'aapka', 'aapki', 'aapke', 'aapko', 'aapne', 'yeh', 'ye', 'iska', 'iski', 'iske', 'isse',
      'isko', 'ispe', 'isme', 'ismein', 'woh', 'wo', 'uska', 'uski', 'uske', 'usse', 'usko', 'uspe', 'usme', 'usmein', 'unka', 'unki',
      'unke', 'unhe', 'unse', 'unko', 'inhe', 'inke', 'inki', 'inka', 'inme', 'kiska', 'kiski', 'kiske', 'kisko', 'kisse', 'kisme',
      
      // 2. Question Words (Prashnavachak)
      'kya', 'kyun', 'kyu', 'kaise', 'kaisa', 'kaisi', 'kab', 'kaha', 'kahan', 'kidhar', 'kitna', 'kitni', 'kitne', 'kaun', 'kaunsa',
      'kaunsi', 'kaunse', 'kisliye', 'kis-tarah', 'kisko',
      
      // 3. Verbs: Media, Audio & Playback Controls
      'chalao', 'chala', 'chale', 'chalana', 'chalae', 'chalaye', 'chalna', 'chalti', 'chalta', 'chalega', 'chalegi', 'bajao', 'baja',
      'bajana', 'bajao-na', 'bajegi', 'bajega', 'sunao', 'sun', 'suno', 'sunna', 'sunaye', 'sunayen', 'batao', 'bata', 'batana', 'bataye',
      'dikhao', 'dikhau', 'dikhana', 'dekho', 'dekh', 'dekhna', 'dekhenge', 'kholo', 'khol', 'kholna', 'khole', 'band', 'bandh', 'roko',
      'rok', 'rokna', 'tham', 'thamo', 'shuru', 'shuruat', 'likho', 'likh', 'likhna', 'padho', 'padh', 'padhna', 'hatao', 'hata', 'hatana',
      'badhao', 'badha', 'badhana', 'ghatao', 'ghata', 'ghatana', 'kam', 'tez', 'dheere', 'dhire', 'aage', 'piche', 'peechhe', 'agla',
      'agli', 'agle', 'pichla', 'pichli', 'pichle', 'badal', 'badlo', 'seek', 'skip', 'forward', 'rewind', 'play', 'pause', 'stop',
      'resume', 'restart', 'mute', 'unmute', 'lock', 'unlock', 'bhejo', 'bhej', 'bhejna', 'lao', 'laa', 'lana', 'rakho', 'rakh', 'rakhna',
      'saaf', 'safai', 'kheecho', 'khicho', 'kheechna', 'le', 'lo', 'lena', 'do', 'de', 'dena', 'dijiye', 'karo', 'kar', 'karna',
      'karein', 'kardo', 'karoge', 'karogi', 'kijiye', 'karunga', 'karenge', 'sojao', 'jago', 'utho', 'khada', 'baitho',
      
      // 4. Quantifiers, Math & Numbers
      'thoda', 'thodi', 'thode', 'bohot', 'bahut', 'zyada', 'jyada', 'poora', 'poori', 'poore', 'aadha', 'aadhi', 'aadhe', 'ek', 'do',
      'teen', 'chaar', 'paanch', 'chhe', 'saat', 'aath', 'nau', 'das', 'gyarah', 'barah', 'terah', 'chaudah', 'pandrah', 'solah',
      'satrah', 'atharah', 'unnees', 'bees', 'pachees', 'tees', 'chalis', 'pachas', 'saath', 'sattar', 'assi', 'nabbe', 'sau',
      'hazar', 'lakh', 'crore', 'pehla', 'pehli', 'pehle', 'dusra', 'dusri', 'dusre', 'teesra', 'teesri', 'aakhri', 'jodo', 'guna',
      'bhaag', 'pratishat', 'percent', 'hisab', 'ginti',
      
      // 5. Everyday Life, Tech & Work
      'gana', 'gaana', 'geet', 'sangeet', 'sur', 'taal', 'video', 'tasveer', 'photo', 'parda', 'screen', 'display', 'aawaz', 'awaz',
      'dhwani', 'volume', 'sound', 'battery', 'bijli', 'charg', 'charge', 'charging', 'mausam', 'barish', 'barsaat', 'dhoop', 'hawa',
      'toofan', 'badal', 'thand', 'garmi', 'taapmaan', 'temperature', 'samay', 'waqt', 'ghadi', 'ghanta', 'minute', 'second', 'din',
      'raat', 'subah', 'shaam', 'dopahar', 'aaj', 'kal', 'parson', 'tarikh', 'tareekh', 'hafte', 'mahina', 'saal', 'chai', 'coffee',
      'pani', 'khana', 'bhookh', 'pyaas', 'kaam', 'daftar', 'office', 'padhai', 'school', 'college', 'naukri', 'pesa', 'paisa',
      'rupaye', 'khabar', 'samachar', 'sandesh', 'message', 'khata', 'kagaz', 'panna', 'note', 'suchi', 'list',
      
      // 6. Courtesies, Greetings, Feelings & Slang
      'namaste', 'namaskar', 'pranam', 'prabhat', 'shubh', 'shukriya', 'dhanyawad', 'kripya', 'please', 'madad', 'sahayata', 'kripa',
      'bhai', 'yaar', 'dost', 'mitra', 'saathi', 'khush', 'udaas', 'gussa', 'thaka', 'thakan', 'aaram', 'sukoon', 'shanti', 'chup',
      'shant', 'maza', 'anand', 'swagat', 'alvida', 'tata', 'bye', 'suno', 'arre', 'are', 'accha', 'achha', 'achhi', 'achhe',
      'theek', 'sahi', 'galat', 'haanji', 'haan', 'nahi', 'naa', 'ji', 'shabash', 'zabardast', 'mast', 'badhiya', 'shandar',
      
      // 7. Connectors, Prepositions & Modifiers
      'aur', 'ya', 'lekin', 'magar', 'agar', 'jab', 'tab', 'jabtak', 'tabtak', 'kyunki', 'isliye', 'taki', 'par', 'pe', 'mein',
      'me', 'se', 'ko', 'ke', 'ki', 'ka', 'tak', 'bhi', 'toh', 'ab', 'abhi', 'tabhi', 'baad', 'andar', 'bahar', 'upar', 'neeche',
      'paas', 'door', 'saath', 'bina', 'sivaay', 'alag', 'sidha', 'seedha', 'jaldi', 'asani', 'mushkil'
    ];

    // Check Devanagari Unicode Range (\u0900-\u097F)
    const hasDevanagari = /[\u0900-\u097F]/.test(text);
    if (hasDevanagari) return true;

    const words = text.toLowerCase().split(/[^a-z0-9]+/);
    return words.some(w => hindiKeywords.includes(w));
  }

  cleanQuery(rawText, removePatterns) {
    let q = rawText;
    removePatterns.forEach(p => {
      q = q.replace(p, '');
    });
    return q.trim() || 'trending';
  }

  // Dynamic Speech Speed Control (Voice-driven)
  adjustSpeakingSpeed(delta, isHindi = false) {
    const title = this.config.userTitle || 'Sir';
    if (isHindi) {
      let currentRate = parseFloat(this.config.hindiVoiceRate) || 0.85;
      currentRate = Math.min(1.35, Math.max(0.65, Math.round((currentRate + delta) * 100) / 100));
      this.config.hindiVoiceRate = currentRate;

      const rateValEl = document.getElementById('valHindiRate');
      const inputEl = document.getElementById('cfgHindiVoiceRate');
      if (rateValEl) rateValEl.textContent = `${currentRate}x`;
      if (inputEl) inputEl.value = currentRate;

      this.saveConfigToServer({ hindiVoiceRate: currentRate });
      const msg = delta > 0
        ? `Ji bilkul ${title}, Hindi bolne ki gati badha di hai. Ab main is speed me baat karunga.`
        : `Ji bilkul ${title}, bolne ki speed ko dheema aur spasht kar diya hai. Ab aaram se sunai dega.`;
      this.speak(msg, null, true);
    } else {
      let currentRate = parseFloat(this.config.voiceRate) || 1.0;
      currentRate = Math.min(1.40, Math.max(0.70, Math.round((currentRate + delta) * 100) / 100));
      this.config.voiceRate = currentRate;

      const rateValEl = document.getElementById('valEngRate');
      const inputEl = document.getElementById('cfgVoiceRate');
      if (rateValEl) rateValEl.textContent = `${currentRate}x`;
      if (inputEl) inputEl.value = currentRate;

      this.saveConfigToServer({ voiceRate: currentRate });
      const msg = delta > 0
        ? `Speed increased, ${title}. Vocal tempo is now accelerated.`
        : `Speaking tempo reduced for optimal clarity, ${title}.`;
      this.speak(msg, null, false);
    }
  }

  resetSpeakingSpeed(isHindi = false) {
    const title = this.config.userTitle || 'Sir';
    if (isHindi) {
      this.config.hindiVoiceRate = 0.85;
      const rateValEl = document.getElementById('valHindiRate');
      const inputEl = document.getElementById('cfgHindiVoiceRate');
      if (rateValEl) rateValEl.textContent = '0.85x';
      if (inputEl) inputEl.value = '0.85';
      this.saveConfigToServer({ hindiVoiceRate: 0.85 });
      this.speak(`Ji ${title}, Hindi bolne ki gati ko default 0.85 par reset kar diya hai.`, null, true);
    } else {
      this.config.voiceRate = 1.0;
      const rateValEl = document.getElementById('valEngRate');
      const inputEl = document.getElementById('cfgVoiceRate');
      if (rateValEl) rateValEl.textContent = '1.00x';
      if (inputEl) inputEl.value = '1.0';
      this.saveConfigToServer({ voiceRate: 1.0 });
      this.speak(`Speech tempo reset to standard 1.0, ${title}.`, null, false);
    }
  }

  // =========================================================
  // NATURAL LANGUAGE & BILINGUAL INTENT ROUTER
  // =========================================================
  processNaturalLanguage(rawText) {
    if (!rawText || !rawText.trim()) {
      const title = this.config.userTitle || 'Sir';
      this.speak(`Maaf kijiye ${title}, aawaz spasht nahi sunai di. Kripya dobara bolein.`, null, true);
      return;
    }

    const normalized = this.normalizeUserInput(rawText);
    const text = normalized || rawText.toLowerCase().trim();
    const title = this.config.userTitle || 'Aditya';
    const isHindi = this.isHindiInput(text);

    window.audioFX.playProcessing();

    // 1. Dynamic Speed Control Voice Commands
    if (text.includes('fast bolo') || text.includes('tez bolo') || text.includes('speed badhao') || 
        text.includes('teji se bolo') || text.includes('jaldi bolo') || text.includes('speak faster') ||
        text.includes('faster speed') || text.includes('तेज बोलो') || text.includes('स्पीड बढ़ाओ')) {
      this.adjustSpeakingSpeed(0.15, isHindi);
      return;
    }

    if (text.includes('slow bolo') || text.includes('dheere bolo') || text.includes('dhire bolo') || 
        text.includes('aaram se bolo') || text.includes('speed kam karo') || text.includes('halke bolo') ||
        text.includes('speak slower') || text.includes('slower') || text.includes('धीरे बोलो') || text.includes('स्पीड कम')) {
      this.adjustSpeakingSpeed(-0.15, isHindi);
      return;
    }

    if (text.includes('normal speed') || text.includes('default speed') || text.includes('normal bolo') || text.includes('reset speed')) {
      this.resetSpeakingSpeed(isHindi);
      return;
    }

    // 2. Language Switching via Voice
    if (text.includes('hindi me bolo') || text.includes('switch to hindi') || text.includes('hindi language') || text.includes('हिंदी में बोलो')) {
      this.currentLanguage = 'hi-IN';
      localStorage.setItem('jarvis_lang', 'hi-IN');
      this.config.language = 'hi-IN';
      this.updateLanguageUI();
      if (this.recognition) this.recognition.lang = 'hi-IN';
      this.speak(`Ji bilkul ${title}, ab se main poori tarah Hindi aur Hinglish me samwaad karunga. Kahiye, main aapke liye kya karoon?`, null, true);
      return;
    }

    if (text.includes('english me bolo') || text.includes('switch to english') || text.includes('speak in english') || text.includes('speak english')) {
      this.currentLanguage = 'en-US';
      localStorage.setItem('jarvis_lang', 'en-US');
      this.config.language = 'en-US';
      this.updateLanguageUI();
      if (this.recognition) this.recognition.lang = 'en-US';
      this.speak(`Switching to English, ${title}. All protocols are operational and ready.`, null, false);
      return;
    }

    // 3. Interactive Follow-up Handling
    if (this.awaitingFollowUp && this.followUpAction) {
      if (text.includes('yes') || text.includes('haan') || text.includes('karo') || text.includes('kar do') || 
          text.includes('kardo') || text.includes('proceed') || text.includes('first') || text.includes('play') || 
          text.includes('chalao') || text.includes('chala do') || text.includes('baja do') || text.includes('bajao') || 
          text.includes('हाँ') || text.includes('करो') || text.includes('चलाओ') || text.includes('बजाओ') || text.includes('प्ले')) {
        const action = this.followUpAction;
        this.dismissProactive();
        if (typeof action === 'function') action();
        const reply = isHindi ? `Ji bilkul ${title}, pehla video turant play kar raha hoon.` : `Playing the primary video now, ${title}.`;
        this.speak(reply, null, isHindi);
        return;
      } else if (text.includes('no') || text.includes('nahi') || text.includes('cancel') || text.includes('stop') || text.includes('नहीं') || text.includes('रहने')) {
        this.dismissProactive();
        const reply = isHindi ? `Ji ${title}, follow-up cancel kar diya gaya hai.` : `Understood, ${title}. Standing by.`;
        this.speak(reply, null, isHindi);
        return;
      }
    }

    // 4. Conversational Greetings & Identity
    if (text.includes('kaise ho') || text.includes('kya haal') || text.includes('how are you') || text.includes('sab theek') || text.includes('कैसे हो')) {
      const reply = isHindi
        ? `Main bilkul theek aur poori urja ke saath taiyaar hoon, ${title}! Sabhi Stark neural core aur telemetry sensors 100 percent active hain. Aap bataiye, aaj main aapki kya seva karoon?`
        : `All Stark systems and neural networks are operating at peak efficiency, ${title}. Thank you for asking. How may I be of service today?`;
      this.speak(reply, null, isHindi);
      return;
    }

    if (text.includes('tum kaun ho') || text.includes('aap kaun ho') || text.includes('who are you') || text.includes('tera naam kya') || text.includes('tumhara naam kya') || text.includes('कौन हो') || text.includes('नाम क्या')) {
      const name = this.config.assistantName || 'J.A.R.V.I.S.';
      const reply = isHindi
        ? `Mera naam ${name} hai, ${title}. Main aapka personal Stark AI Assistant hoon, jo aapke Mac workstation aur mobile phone ko poori tarah control aur manage karta hai.`
        : `I am ${name}, your personal Stark Industries Artificial Intelligence Assistant, engineered to manage your workstation and mobile environment.`;
      this.speak(reply, null, isHindi);
      return;
    }

    // 5. Liveness / Hearing Check
    if (text.includes('sun rahe') || text.includes('sun sakte') || text.includes('hear me') || 
        text.includes('awaz aa rahi') || text.includes('aawaz aa rahi') || text.includes('online ho') || 
        text.includes('सुन') || text.includes('आवाज')) {
      const reply = isHindi
        ? `Ji bilkul ${title}, main aapko bilkul saaf aur spasht sun raha hoon! Sabhi audio link aur neural protocols 100 percent active hain. Kahiye ${title}, main aapke liye kya karoon?`
        : `Loud and clear, ${title}! Communication link is crystal clear and all Stark telemetry systems are operating at peak efficiency. How may I serve you?`;
      this.speak(reply, null, isHindi);
      return;
    }

    // 5B. YouTube Video Downloader Intent
    const isDownloadIntent = text.includes('download') || text.includes('डाउनलोड') || text.includes('save video');
    if (isDownloadIntent) {
      let quality = '1080p';
      if (text.includes('4k') || text.includes('2160')) quality = '4k';
      else if (text.includes('720') || text.includes('hd')) quality = '720p';
      else if (text.includes('audio') || text.includes('mp3') || text.includes('gana')) quality = 'mp3';

      this.sendMacCommand('DOWNLOAD_YOUTUBE', { quality });
      const reply = isHindi
        ? `Ji bilkul ${title}, YouTube video ko ${quality} me download karna shuru kar diya hai. File Downloads folder me save ho rahi hai.`
        : `Downloading active YouTube video in ${quality}, ${title}. The video will be saved directly to your Downloads folder.`;
      this.speak(reply, null, isHindi);
      return;
    }

    // 6. YouTube Ad Skipper
    const isAdSkipQuery = text.includes('skip ad') || text.includes('skip add') || text.includes('ad skip') || 
                          text.includes('add skip') || text.includes('ads skip') || text.includes('ads hatao') || 
                          text.includes('ad hatao') || text.includes('add hatao') || text.includes('ad band') || 
                          text.includes('add band') || text.includes('advertisement') || text.includes('skip karo') || 
                          text.includes('add aaye') || text.includes('ad aaye') || text.includes('स्किप') || 
                          text.includes('ऐड') || text.includes('विज्ञापन');

    if (isAdSkipQuery) {
      this.sendMacCommand('SKIP_AD');
      const reply = isHindi
        ? `Ji bilkul ${title}, YouTube ad ko turant skip kar diya gaya hai.`
        : `Skipping advertisement on active YouTube stream now, ${title}.`;
      this.speak(reply, null, isHindi);
      return;
    }

    // 6B. Media Forward / Rewind / Seek Control (Single-Tab Active Playback)
    const isMediaSeekQuery = text.includes('forward') || text.includes('rewind') || text.includes('seek') || 
                             text.includes('aage karo') || text.includes('aage badhao') || text.includes('aage le jao') ||
                             text.includes('piche karo') || text.includes('piche le jao') || text.includes('peechhe') ||
                             text.includes('पीछे') || text.includes('आगे') || text.includes('फॉरवर्ड') || text.includes('रिवाइंड');

    if (isMediaSeekQuery) {
      let seconds = 30; // default 30s
      const minMatch = text.match(/(\d+)\s*(?:min|minute|minutes|मिनट)/i);
      const secMatch = text.match(/(\d+)\s*(?:sec|second|seconds|सेकंड)/i);
      if (minMatch) {
        seconds = parseInt(minMatch[1], 10) * 60;
      } else if (secMatch) {
        seconds = parseInt(secMatch[1], 10);
      }

      const isBackward = text.includes('piche') || text.includes('peechhe') || text.includes('rewind') || text.includes('backward') || text.includes('पीछे');
      const deltaSeconds = isBackward ? -seconds : seconds;
      const displayDuration = seconds >= 60 ? `${Math.round(seconds / 60)} minute` : `${seconds} second`;

      this.sendMacCommand('MEDIA_SEEK', { seconds: deltaSeconds });
      const reply = isHindi
        ? `Ji bilkul ${title}, video ko ${displayDuration} ${isBackward ? 'piche rewind' : 'aage forward'} kar diya hai.`
        : `Playback ${isBackward ? 'rewound' : 'advanced'} by ${displayDuration}, ${title}.`;

      this.speak(reply, null, isHindi);
      return;
    }

    // 6C. Media Pause / Resume / Restart / Next / Previous / Tab Cleanup
    const isNextQuery = text.includes('next') || text.includes('agla') || text.includes('agli') || text.includes('agle') || text.includes('अगला') || text.includes('नेक्स्ट');
    const isPrevQuery = text.includes('prev') || text.includes('previous') || text.includes('pichla') || text.includes('pichhla') || text.includes('pichli') || text.includes('pichle') || text.includes('पिछला') || text.includes('प्रीवियस');
    const isCleanTabsQuery = (text.includes('tab') || text.includes('page') || text.includes('tabs')) && 
                             (text.includes('close') || text.includes('band') || text.includes('hatao') || text.includes('saaf') || text.includes('extra') || text.includes('unused') || text.includes('faltu'));
    const isPauseQuery = (text.includes('pause') || text.includes('rok do') || text.includes('roko') || text.includes('gana rok') || text.includes('video rok') || text.includes('gana band') || text.includes('रोको') || text.includes('पॉज')) && !text.includes('unpause');
    const isResumeQuery = text.includes('resume') || text.includes('unpause') || text.includes('chalu karo') || text.includes('chalao dobara') || text.includes('चालू') || text.includes('रिज्यूम');
    const isRestartQuery = text.includes('shuru se') || text.includes('dubara shuru') || text.includes('restart') || text.includes('रीस्टार्ट') || text.includes('शुरू से');

    if (isCleanTabsQuery) {
      this.sendMacCommand('CLOSE_INACTIVE_YOUTUBE_TABS');
      const reply = isHindi
        ? `Ji bilkul ${title}, sabhi inactive aur extra YouTube tabs ko band kar diya hai. Kewal active gaana chal raha hai.`
        : `Closed all inactive background YouTube tabs, ${title}. Maintaining single active playback.`;
      this.speak(reply, null, isHindi);
      return;
    } else if (isNextQuery && !text.includes('previous') && !text.includes('pichla')) {
      this.sendMacCommand('MEDIA_NEXT');
      const reply = isHindi ? `Ji ${title}, agla gaana play kar diya hai.` : `Playing next track on active YouTube queue, ${title}.`;
      this.speak(reply, null, isHindi);
      return;
    } else if (isPrevQuery) {
      this.sendMacCommand('MEDIA_PREV');
      const reply = isHindi ? `Ji ${title}, pichhla gaana play kar diya hai.` : `Playing previous track, ${title}.`;
      this.speak(reply, null, isHindi);
      return;
    } else if (isRestartQuery) {
      this.sendMacCommand('MEDIA_RESTART');
      const reply = isHindi ? `Ji ${title}, video ko dubara shuru se play kar diya hai.` : `Restarting active stream from the beginning, ${title}.`;
      this.speak(reply, null, isHindi);
      return;
    } else if (isPauseQuery) {
      this.sendMacCommand('MEDIA_PAUSE');
      const reply = isHindi ? `Ji bilkul ${title}, playback rok diya hai.` : `Playback paused, ${title}.`;
      this.speak(reply, null, isHindi);
      return;
    } else if (isResumeQuery) {
      this.sendMacCommand('MEDIA_RESUME');
      const reply = isHindi ? `Ji ${title}, playback dubara chalu kar diya hai.` : `Playback resumed, ${title}.`;
      this.speak(reply, null, isHindi);
      return;
    }

    // 7. Stark Voice Calculator & Math Engine
    const isMathQuery = text.includes('calculate') || text.includes('plus') || text.includes('minus') || 
                        text.includes('divided by') || text.includes('multiply') || text.includes('into') || 
                        text.includes('guna') || text.includes('bhaag') || text.includes('kitna hota hai') ||
                        text.includes('percent of') || text.includes('जोड़ो') || text.includes('गुणा') || text.includes('भाग') || text.includes('घटाओ');

    if (isMathQuery) {
      try {
        let expr = text
          .replace(/.*(calculate|batao|kitna hota hai|solve|कितना होता है|कितना है)\s*/i, '')
          .replace(/kitna hota hai|kitna hai|कितना होता है|बताओ/gi, '')
          .replace(/plus|aur|jodo|जोड़ो|और/gi, '+')
          .replace(/minus|ghatao|kam|घटाओ|कम/gi, '-')
          .replace(/multiply by|multiplied by|into|guna|गुणा/gi, '*')
          .replace(/divided by|divide by|bhaag|भाग/gi, '/')
          .replace(/x/g, '*')
          .trim();

        const percentMatch = expr.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|प्रतिशत)\s*(?:of|ka|का)?\s*(\d+(?:\.\d+)?)/i);
        if (percentMatch) {
          expr = `(${percentMatch[1]} / 100) * ${percentMatch[2]}`;
        }

        const sanitized = expr.replace(/[^0-9+\-*/(). ]/g, '').trim();
        if (sanitized && /^[0-9(]/.test(sanitized)) {
          const calcResult = Function(`'use strict'; return (${sanitized})`)();
          if (typeof calcResult === 'number' && !isNaN(calcResult)) {
            const formattedRes = Number.isInteger(calcResult) ? calcResult : calcResult.toFixed(2);
            const reply = isHindi
              ? `Aapke ganit ke calculation ka parinaam ${formattedRes} hai, ${title}.`
              : `The calculated result is precisely ${formattedRes}, ${title}.`;
            this.speak(reply, null, isHindi);
            return;
          }
        }
      } catch (err) {}
    }

    // 7. YouTube & Vanced Direct Video Play Engine (Single Tab Only)
    if (text.includes('youtube') || text.includes('यूट्यूब') || text.includes('video') || text.includes('वीडियो') || text.includes('vanced') || text.includes('revanced')) {
      const isPureSearchOnly = (text.includes('search') || text.includes('khojo') || text.includes('dhoondo') || text.includes('results dikhao') || text.includes('खोजो') || text.includes('सर्च')) &&
                               !(text.includes('chalao') || text.includes('play') || text.includes('bajao') || text.includes('sunao') || text.includes('gana') || text.includes('song'));

      const query = this.cleanQuery(rawText, [
        /.*(youtube|यूट्यूब|video|वीडियो|vanced|revanced)\s*(par|pe|on|में|पर|app|में)?\s*/gi,
        /search|karo|play|chalao|bajao|sunao|laga do|lagao|dikhau|dikhao|dekho|सर्च|करो|चलाओ|बजाओ|सुनाओ|दिखाओ|चला दो/gi
      ]);

      this.lastIntent = { type: 'youtube', query };

      if (isPureSearchOnly) {
        // Pure Search Explicitly Requested
        this.openAppSearch('youtube_search', query);
        const reply = isHindi
          ? `Ji bilkul ${title}, YouTube par "${query}" search results open kar diye hain.`
          : `Displaying search results for "${query}" on YouTube, ${title}.`;
        this.speak(reply, null, isHindi);
        return;
      } else {
        // DIRECT INSTANT AUTO-PLAY INTO SINGLE TAB (No intermediate search tab)
        this.playYouTube(query);
        const deviceTarget = this.isMobile ? 'YouTube Vanced' : 'YouTube';
        const reply = isHindi
          ? `Ji bilkul ${title}, ${deviceTarget} par "${query}" play kar diya hai.`
          : `Directly playing "${query}" on ${deviceTarget}, ${title}.`;
        this.speak(reply, null, isHindi);
        return;
      }
    }

    // 8. Music / Songs / Gaana Intent -> Route strictly to YouTube & YouTube Vanced (No Spotify)
    const isMusicQuery = text.includes('song') || text.includes('gana') || text.includes('gaana') || 
                         text.includes('music') || text.includes('गाना') || text.includes('गाने') || 
                         text.includes('सॉन्ग') || text.includes('म्यूजिक') || text.includes('geet') || 
                         text.includes('गीत');

    if (isMusicQuery) {
      const query = this.cleanQuery(rawText, [
        /.*(song|gana|gaana|music|geet|गाना|गाने|सॉन्ग|म्यूजिक|गीत)\s*(par|pe|on|chalao|play|bajao|बजाओ|चलाओ|सुनाओ)?\s*/gi,
        /play|karo|chalao|bajao|sunao|chala do|baja do|kholo|प्ले|करो|चलाओ|बजाओ/gi
      ]);

      this.lastIntent = { type: 'youtube_play', query };
      this.playYouTube(query);

      const deviceTarget = this.isMobile ? 'YouTube Vanced' : 'YouTube';
      const reply = isHindi
        ? `Ji bilkul ${title}, ${deviceTarget} par "${query}" play kar raha hoon.`
        : `Right away, ${title}. Playing "${query}" on ${deviceTarget}.`;

      this.speak(reply, null, isHindi);
      return;
    }

    // 9. Atmospheric Weather Telemetry
    if (text.includes('weather') || text.includes('mausam') || text.includes('temperature') || 
        text.includes('barish') || text.includes('garmi') || text.includes('thand') ||
        text.includes('मौसम') || text.includes('तापमान') || text.includes('बारिश')) {
      let city = "Delhi";
      const cityMatch = text.match(/(?:in|me|mein|of|का|में)\s+([a-zA-Z]+)/i);
      if (cityMatch && cityMatch[1]) {
        city = cityMatch[1];
      }
      this.fetchWeather((w) => {
        const report = isHindi
          ? `Atmospheric report taiyaar hai, ${title}. ${w.city} me abhi taapmaan ${w.temp_C} degree Celsius hai aur mausam ${w.desc} hai. Humidity ${w.humidity} percent par hai.`
          : `Allow me to provide the atmospheric briefing for ${w.city}, ${title}. Current ambient temperature is ${w.temp_C} degrees Celsius with ${w.desc}. Humidity stands at ${w.humidity} percent.`;
        this.speak(report, null, isHindi);
      }, city);
      return;
    }

    // 10. Battery & Power Cells Telemetry
    if (text.includes('battery') || text.includes('charge') || text.includes('power') || 
        text.includes('charging') || text.includes('बैटरी') || text.includes('चार्ज')) {
      this.fetchSystemInfo((stats) => {
        const msg = isHindi
          ? `Power cells abhi ${stats.batteryPercent} percent par hain, ${title}, ${stats.isCharging ? 'aur charging line connected hai' : 'battery power par run ho rahe hain'}. Sabhi Stark subsystems nominal hain.`
          : `Power reserves are currently at ${stats.batteryPercent} percent, ${title}, ${stats.isCharging ? 'and actively receiving charge' : 'operating on battery power'}. All Stark OS subsystems are operating at peak efficiency.`;
        this.speak(msg, null, isHindi);
      });
      return;
    }

    // 11. Time and Date Query
    if (text.includes('time') || text.includes('samay') || text.includes('kitna baj') || 
        text.includes('date') || text.includes('tarikh') || text.includes('aaj ka din') ||
        text.includes('समय') || text.includes('तारीख') || text.includes('दिन')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      const msg = isHindi
        ? `Abhi samay ${timeStr} hai, ${title}, aur aaj ${dateStr} hai.`
        : `Current time is precisely ${timeStr}, ${title}, on ${dateStr}.`;
      this.speak(msg, null, isHindi);
      return;
    }

    // 12. Mac Master Volume Control (Relative 10% Steps & Absolute Percentages)
    if (text.includes('volume') || text.includes('aawaz') || text.includes('sound') || 
        text.includes('awaz') || text.includes('वॉल्यूम') || text.includes('आवाज')) {

      // Check for Mute / Unmute
      if (text.includes('unmute') || text.includes('un-mute') || text.includes('aawaz chalu') || text.includes('un mute')) {
        this.sendMacCommand('UNMUTE_VOLUME');
        const msg = isHindi ? `Ji sir, master audio ko unmute kar diya gaya hai.` : `Acoustic output unmuted, ${title}.`;
        this.speak(msg, null, isHindi);
        return;
      } else if (text.includes('mute') || text.includes('silent') || text.includes('band') || text.includes('chup') || text.includes('म्यूट') || text.includes('शांत') || text.includes('बंद')) {
        this.sendMacCommand('MUTE_VOLUME');
        const msg = isHindi ? `Ji sir, master audio output ko poori tarah mute kar diya gaya hai.` : `Acoustic output has been completely muted, ${title}.`;
        this.speak(msg, null, isHindi);
        return;
      }

      // Check if relative step (10-10 percent / 10% badhao / badhao / kam karo / thoda)
      const isRelativeUp = text.includes('badhao') || text.includes('jyada') || text.includes('up') || text.includes('tez') || text.includes('बढ़ाओ') || text.includes('तेज') || text.includes('increase');
      const isRelativeDown = text.includes('kam') || text.includes('ghatao') || text.includes('down') || text.includes('dheere') || text.includes('कम') || text.includes('घटाओ') || text.includes('decrease') || text.includes('slow');
      const isSteppingMentioned = text.includes('10-10') || text.includes('10 10') || text.includes('step') || text.includes('thoda') || text.includes('thodi');

      const numMatch = text.match(/\d+/);
      const specifiedNumber = numMatch ? parseInt(numMatch[0]) : null;

      if (isRelativeUp || isRelativeDown || isSteppingMentioned) {
        let delta = (specifiedNumber && specifiedNumber <= 50) ? specifiedNumber : 10;
        if (isRelativeDown) delta = -delta;

        this.sendMacCommand('CHANGE_VOLUME', { delta });
        const absDelta = Math.abs(delta);
        const actionWord = delta > 0 ? (isHindi ? `${absDelta} percent badha` : `increased by ${absDelta}%`) : (isHindi ? `${absDelta} percent kam kar` : `decreased by ${absDelta}%`);
        const msg = isHindi
          ? `Ji bilkul ${title}, volume ko ${actionWord} diya hai.`
          : `Master acoustic volume ${actionWord}, ${title}.`;
        this.speak(msg, null, isHindi);
        return;
      }

      // Absolute Volume Level
      let level = specifiedNumber !== null ? specifiedNumber : (text.includes('full') ? 100 : 70);
      this.sendMacCommand('SET_VOLUME', { level });
      const msg = isHindi
        ? `Ji bilkul ${title}, master volume ko ${level} percent par calibrate kar diya gaya hai.`
        : `Master acoustic volume has been precisely calibrated to ${level} percent, ${title}.`;
      this.speak(msg, null, isHindi);
      return;
    }

    // 13. Mac Screen Lock
    if (text.includes('lock') || text.includes('sleep') || text.includes('band kar do') || 
        text.includes('screen lock') || text.includes('workstation lock') || text.includes('लॉक')) {
      this.sendMacCommand('LOCK_SCREEN');
      const msg = isHindi
        ? `Workstation ko secure karke display lock kar di gayi hai, ${title}. Sentry sensors active hain.`
        : `Securing the workstation and initiating protocol lockdown, ${title}. Sentry surveillance is active.`;
      this.speak(msg, null, isHindi);
      return;
    }

    // 14. Mac Screenshot
    if (text.includes('screenshot') || text.includes('snap') || text.includes('photo kheecho') || text.includes('स्क्रीनशॉट')) {
      this.sendMacCommand('TAKE_SCREENSHOT');
      const reply = isHindi
        ? `Desktop visual capture karke Desktop folder par surakshit save kar liya gaya hai, ${title}. Kya iska preview open karoon?`
        : `Desktop visual captured and archived to your Desktop folder, ${title}. Shall I open it in high-resolution preview for you?`;

      this.speak(
        reply,
        () => this.setProactivePrompt(isHindi ? 'Preview open karoon, sir?' : 'Open captured visual preview, sir?', [
          { text: isHindi ? 'Preview Kholo' : 'Open Preview', action: () => this.sendMacCommand('TERMINAL_COMMAND', { command: 'open ~/Desktop/Screenshot_JARVIS_*.png' }) },
          { text: isHindi ? 'Save Rehne Do' : 'Keep Saved', action: () => this.dismissProactive() }
        ]),
        isHindi
      );
      return;
    }

    // 15. Mac App Launchers
    if (text.includes('chrome kholo') || text.includes('open chrome') || text.includes('google kholo')) {
      this.sendMacCommand('OPEN_APP', { appName: 'Google Chrome' });
      this.speak(isHindi ? `Google Chrome open kar raha hoon, ${title}.` : `Launching Google Chrome, ${title}.`, null, isHindi);
      return;
    }
    if (text.includes('vs code kholo') || text.includes('open vs code') || text.includes('code editor')) {
      this.sendMacCommand('OPEN_APP', { appName: 'Visual Studio Code' });
      this.speak(isHindi ? `Visual Studio Code open kar diya gaya hai, ${title}.` : `Launching Visual Studio Code workspace, ${title}.`, null, isHindi);
      return;
    }

    // 16. Persistent Voice Notes
    if (text.includes('note down') || text.includes('save note') || text.includes('yaad rakhna') || 
        text.includes('write down') || text.includes('note likho') || text.includes('note karo') ||
        text.includes('नोट') || text.includes('लिखो')) {
      const noteContent = rawText.replace(/.*(note down|save note|yaad rakhna|write down|note likho|note karo|नोट लिखो|नोट करो)\s*:?\s*/i, '').trim();
      if (noteContent) {
        this.addNote(noteContent);
        const msg = isHindi
          ? `Ji bilkul ${title}, maine ise aapki Stark Memory Matrix me surakshit note kar liya hai: "${noteContent}"`
          : `Certainly, ${title}. I have cataloged this entry directly into your Stark Memory Matrix: "${noteContent}"`;
        this.speak(msg, null, isHindi);
        return;
      }
    }

    if (text.includes('show notes') || text.includes('open notes') || text.includes('mera notes') || 
        text.includes('notes dikhao') || text.includes('नोट्स दिखाओ')) {
      this.openModal('modalNotes');
      const msg = isHindi
        ? `Aapke saved memory notes open kar diye hain, ${title}. Total ${this.notes.length} entries surakshit hain.`
        : `Presenting your saved memory logs, ${title}. There are currently ${this.notes.length} active entries in the matrix.`;
      this.speak(msg, null, isHindi);
      return;
    }

    if (text.includes('delete notes') || text.includes('clear notes') || text.includes('saare notes delete')) {
      this.clearAllNotes();
      const msg = isHindi ? `Sabhi memory notes saaf kar diye gaye hain, ${title}.` : `All memory notes cleared, ${title}.`;
      this.speak(msg, null, isHindi);
      return;
    }

    // 17. Focus Ambience Mode (432Hz Alpha Drone)
    if (text.includes('focus mode') || text.includes('ambience') || text.includes('focus music') || text.includes('फोकस')) {
      const isPlaying = window.audioFX.toggleFocusAmbience();
      const banner = document.getElementById('ambienceStatusBanner');
      if (banner) banner.classList.toggle('hidden', !isPlaying);
      const protoBtn = document.getElementById('btnFocusProto');
      if (protoBtn) protoBtn.classList.toggle('active', isPlaying);

      if (isPlaying) {
        const msg = isHindi
          ? `Ji sir, Focus Protocol engage kar diya gaya hai. 432Hz deep focus binaural frequency shuru kar raha hoon.`
          : `Focus Protocol engaged, ${title}. Synthesizing a 432Hz alpha-harmonic soundscape for your undivided concentration.`;
        this.speak(msg, null, isHindi);
      } else {
        const msg = isHindi
          ? `Focus soundscape ko viram de diya gaya hai, ${title}. Standing by.`
          : `Disengaging Focus Protocol, ${title}. Standing by for further instructions.`;
        this.speak(msg, null, isHindi);
      }
      return;
    }

    // 18. Camera HUD Scanner
    if (text.includes('camera') || text.includes('scanner') || text.includes('scan') || text.includes('vision') || text.includes('कैमरा')) {
      this.startCameraScanner();
      const msg = isHindi
        ? `Ji sir, Holographic camera scanner initialize kar diya gaya hai. Live optical sensors taiyaar hain.`
        : `Initializing holographic camera feed, ${title}. Optical telemetry and targeting reticles are now operational.`;
      this.speak(msg, null, isHindi);
      return;
    }

    // 19. Morning Protocol 01
    if (text.includes('good morning') || text.includes('namaste') || text.includes('wake up') || 
        text.includes('shubh prabhat') || text.includes('शुभ प्रभात') || text.includes('नमस्ते')) {
      this.executeMorningProtocol(isHindi);
      return;
    }

    // 20. Emergency SOS Protocol
    if (text.includes('emergency') || text.includes('sos') || text.includes('help me') || 
        text.includes('bachao') || text.includes('बचाओ') || text.includes('इमरजेंसी')) {
      this.triggerEmergencySOS(isHindi);
      return;
    }

    // 21. Check Offline Learned Neural Memory (0ms Local Hit)
    const learnedMatch = this.matchLearnedIntents(text, isHindi);
    if (learnedMatch) {
      console.log('[JARVIS LOCAL MEMORY HIT 🧠]', learnedMatch.query);
      const learnedReply = isHindi ? (learnedMatch.reply_hi || learnedMatch.reply_en) : (learnedMatch.reply_en || learnedMatch.reply_hi);
      if (learnedMatch.action) {
        this.sendMacCommand(learnedMatch.action, learnedMatch.actionParams || {});
      }
      this.speak(learnedReply, null, isHindi);
      return;
    }

    // 22. Hybrid Gemini AI Mode (Cloud Fallback + Continuous Auto-Training)
    if (this.config.aiMode !== false) {
      this.queryGeminiAI(rawText, isHindi);
      return;
    }

    // Fallback Polite Replies
    const hindiFallbacks = [
      `Ji ${title}, kahiye main aapke liye kya chalaoon ya open karoon?`,
      `Ji bilkul ${title}, main sun raha hoon. Kahiye kya karna hai?`,
      `Aapki seva me hazir hoon, ${title}. Kahiye main aapki kya madad karoon?`
    ];
    const englishFallbacks = [
      `Always at your service, ${title}. How may I assist you?`,
      `I'm listening, ${title}. What would you like me to do?`,
      `Ready to assist, ${title}. What can I do for you?`
    ];

    const pool = isHindi ? hindiFallbacks : englishFallbacks;
    const reply = pool[Math.floor(Math.random() * pool.length)];
    this.speak(reply, null, isHindi);
  }

  // =========================================================
  // STARK PROTOCOLS
  // =========================================================
  executeMorningProtocol(isHindi = false) {
    const title = this.config.userTitle || 'Sir';
    this.fetchSystemInfo((stats) => {
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const greeting = isHindi
        ? `Shubh prabhat, ${title}. Samay ${timeStr} hai. Battery ${stats.batteryPercent} percent hai. Sabhi protocols active hain aur aapke aadesh ke liye taiyaar hain.`
        : `Good morning, ${title}. Current time is ${timeStr}. Battery is at ${stats.batteryPercent} percent. All systems online and standing by.`;

      this.speak(
        greeting,
        () => this.setProactivePrompt(isHindi ? 'Workspace start karoon?' : 'Initialize workspace?', [
          { text: isHindi ? 'VS Code & Chrome Kholo' : 'Launch Coding Workspace', action: () => { this.sendMacCommand('OPEN_APP', { appName: 'Visual Studio Code' }); this.sendMacCommand('OPEN_APP', { appName: 'Google Chrome' }); } },
          { text: isHindi ? 'Focus Music Chalao' : 'Play Focus Music', action: () => this.openAppSearch('spotify', 'synthwave focus') }
        ]),
        isHindi
      );
    });
  }

  // =========================================================
  // CAMERA SCANNER HUD
  // =========================================================
  async startCameraScanner() {
    this.openModal('modalCamera');
    const video = document.getElementById('cameraVideo');
    if (!video) return;

    try {
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach(track => track.stop());
      }
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      video.srcObject = this.cameraStream;
      console.log('[JARVIS VISION] Camera stream attached.');
    } catch (err) {
      console.warn('[JARVIS VISION] Camera error:', err);
      this.speak(`Camera access unavailable or permission denied, ${this.config.userTitle}.`);
    }
  }

  stopCameraScanner() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.closeModal('modalCamera');
  }

  // =========================================================
  // PERSISTENT STARK NOTES
  // =========================================================
  async fetchNotes() {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      this.renderNotes(data);
    } catch (err) {
      console.warn('Fetch notes error:', err);
    }
  }

  renderNotes(notesList) {
    this.notes = notesList || [];
    const countBadge = document.getElementById('notesCountBadge');
    if (countBadge) countBadge.textContent = this.notes.length;

    const container = document.getElementById('notesListContainer');
    if (!container) return;

    if (this.notes.length === 0) {
      container.innerHTML = '<p class="text-muted text-center" style="font-size:0.8rem; padding:12px;">No active memory notes. Speak "Jarvis, note down..." or "Note likho..." to add.</p>';
      return;
    }

    container.innerHTML = '';
    this.notes.forEach(note => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.innerHTML = `
        <div class="note-meta">
          <span class="note-content">${note.text}</span>
          <span class="note-timestamp">${note.created || ''}</span>
        </div>
        <button class="note-del-btn" onclick="window.jarvis.deleteNote(${note.id})">&times;</button>
      `;
      container.appendChild(card);
    });
  }

  addNote(text) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'ADD_NOTE',
        payload: { text, originClientId: this.clientId, sourceDevice: this.deviceType }
      }));
    } else {
      fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      }).then(() => this.fetchNotes());
    }
  }

  deleteNote(noteId) {
    fetch(`/api/notes/${noteId}`, { method: 'DELETE' }).then(() => this.fetchNotes());
  }

  clearAllNotes() {
    fetch('/api/notes', { method: 'DELETE' }).then(() => this.fetchNotes());
  }

  // Weather Fetch
  async fetchWeather(callback = null, city = "Delhi") {
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
      const data = await res.json();
      this.renderWeather(data);
      if (callback) callback(data);
    } catch (err) {
      console.warn('Weather fetch error:', err);
    }
  }

  renderWeather(w) {
    if (!w) return;
    const tempEl = document.getElementById('weatherTemp');
    const descEl = document.getElementById('weatherDesc');
    const humEl = document.getElementById('weatherHum');
    const windEl = document.getElementById('weatherWind');

    if (tempEl) tempEl.textContent = w.temp_C;
    if (descEl) descEl.textContent = w.desc;
    if (humEl) humEl.textContent = w.humidity;
    if (windEl) windEl.textContent = w.windspeedKmph;
  }

  // =========================================================
  // YOUTUBE DIRECT PLAY ENGINE & VANCED DEEP-LINK
  // Resolves top video and launches direct autoplay playback
  // Supports: Mac Workstation browser & Android YouTube Vanced/ReVanced
  // =========================================================
  async playYouTube(query = '', explicitDevice = null) {
    const cleanQ = query.trim() || 'trending';
    this.triggerHaptic([20, 40]);
    
    // Check if query explicitly targets Mac or Mobile
    const targetMac = explicitDevice === 'mac' || /\b(mac|computer|laptop|pc|desktop)\b/i.test(query);
    const targetPhone = explicitDevice === 'mobile' || /\b(phone|mobile|vanced|revanced|earphone|headphone)\b/i.test(query);

    console.log(`[JARVIS YOUTUBE] Direct Play Initiated for "${cleanQ}" on ${this.deviceType} (targetMac: ${targetMac}, targetPhone: ${targetPhone})`);

    try {
      // 1. Resolve first video watch URL and videoId from backend
      const res = await fetch(`/api/youtube/resolve?q=${encodeURIComponent(cleanQ)}`);
      const data = await res.json();
      const watchUrl = data.watchUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ)}`;
      const videoId = data.videoId;

      // 2. Play on Mac workstation (Strict Single-Tab Google Chrome Engine)
      if (!targetPhone) {
        this.sendMacCommand('PLAY_YOUTUBE', { query: cleanQ, url: watchUrl });
      }

      // 3. Only if explicitly targeting phone / mobile (e.g. YouTube Vanced):
      if (targetPhone && this.isMobile) {
        if (videoId) {
          const vancedUri = `vnd.youtube:${videoId}`;
          try {
            window.location.href = vancedUri;
          } catch (e) {
            window.open(watchUrl, '_blank');
          }
        } else {
          window.open(watchUrl, '_blank');
        }
      }
    } catch (err) {
      console.warn('[JARVIS YOUTUBE PLAY ERROR]', err);
      // Fallback
      this.sendMacCommand('PLAY_YOUTUBE', { query: cleanQ });
    }
  }

  // Universal App Deep Link
  openAppSearch(appType, query = '') {
    const q = encodeURIComponent(query);
    this.triggerHaptic([20, 30]);
    console.log(`[JARVIS MATRIX] ${appType} -> "${query}" (Mobile: ${this.isMobile})`);

    let targetUrl = '';
    if (appType === 'youtube' || appType === 'youtube_play') {
      this.playYouTube(query);
      return;
    } else if (appType === 'youtube_search') {
      targetUrl = `https://www.youtube.com/results?search_query=${q}`;
    } else if (appType === 'spotify') {
      targetUrl = `https://open.spotify.com/search/${q}`;
    } else if (appType === 'maps') {
      targetUrl = `https://maps.google.com/?q=${q}`;
    } else if (appType === 'whatsapp') {
      targetUrl = this.isMobile ? `https://api.whatsapp.com/send?text=${q}` : `https://web.whatsapp.com/`;
    } else if (appType === 'chrome') {
      targetUrl = `https://www.google.com/search?q=${q}`;
    }

    this.sendMacCommand('OPEN_URL', { url: targetUrl });
    if (this.isMobile && targetUrl) {
      window.open(targetUrl, '_blank');
    }
  }

  executeDirectCall() {
    const contact = this.config.emergencyContact || '112';
    window.location.href = `tel:${contact}`;
  }

  // =========================================================
  // OFFLINE NEURAL MEMORY & CONTINUOUS DISTILLATION ENGINE
  // =========================================================
  async fetchLearnedIntents() {
    try {
      const res = await fetch('/api/learned-intents');
      const data = await res.json();
      this.learnedIntents = (data && data.intents) ? data.intents : [];
      console.log(`[JARVIS NEURAL MEMORY] Loaded ${this.learnedIntents.length} offline learned skills.`);
    } catch (e) {
      console.warn('[JARVIS NEURAL MEMORY] Fetch error:', e);
    }
  }

  matchLearnedIntents(text, isHindi) {
    if (!this.learnedIntents || this.learnedIntents.length === 0) return null;
    const cleanText = text.toLowerCase().trim();
    const words = cleanText.split(/\s+/).filter(w => w.length > 2);

    for (const item of this.learnedIntents) {
      if (item.query && (cleanText === item.query.toLowerCase() || cleanText.includes(item.query.toLowerCase()) || item.query.toLowerCase().includes(cleanText))) {
        return item;
      }
      if (item.keywords && Array.isArray(item.keywords)) {
        const matches = item.keywords.filter(k => words.includes(k.toLowerCase()) || cleanText.includes(k.toLowerCase()));
        if (matches.length >= Math.min(2, item.keywords.length)) {
          return item;
        }
      }
    }
    return null;
  }

  async queryGeminiAI(prompt, isHindi) {
    this.updateVoiceStatus('THINKING // GEMINI AI 🧠');
    const title = this.config.userTitle || 'Sir';

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          isHindi,
          originClientId: this.clientId,
          sourceDevice: this.deviceType
        })
      });

      const data = await res.json();
      if (data.reply) {
        this.speak(data.reply, null, isHindi);
        if (data.autoTrained) {
          console.log('[JARVIS AUTO-DISTILLATION] Continuous learning saved to offline neural matrix.');
          this.fetchLearnedIntents();
        }
        return true;
      }
    } catch (e) {
      console.warn('[JARVIS AI QUERY ERROR]', e);
    }

    const fallback = isHindi
      ? `Ji ${title}, kahiye main aapke liye kya karoon?`
      : `At your service, ${title}. How may I help you?`;
    this.speak(fallback, null, isHindi);
    return false;
  }

  toggleAIMode() {
    this.config.aiMode = !this.config.aiMode;
    this.saveConfigToServer({ aiMode: this.config.aiMode });
    const btn = document.getElementById('btnAIToggle');
    if (btn) {
      btn.textContent = this.config.aiMode ? '🤖 AI: ON' : '🤖 AI: OFF';
      btn.classList.toggle('active', this.config.aiMode);
    }
    const title = this.config.userTitle || 'Sir';
    this.speak(
      this.config.aiMode 
        ? `Gemini AI Hybrid Mode activated, ${title}. Continuous self-training is online.` 
        : `AI Cloud mode suspended, ${title}. Running pure offline rules.`
    );
  }

  // Normalize phonetic speech for ultra-clear TTS output (ChatGPT voice style)
  normalizeSpeechText(text) {
    if (!text) return '';
    return text
      .replace(/°C/g, ' degrees Celsius')
      .replace(/km\/h/g, ' kilometers per hour')
      .replace(/%/g, ' percent')
      .replace(/vs code/gi, 'V S Code')
      .replace(/pwa/gi, 'P W A')
      .replace(/hud/gi, 'H U D')
      .replace(/cpu/gi, 'C P U')
      .replace(/ram/gi, 'R A M')
      .replace(/os/gi, 'O S')
      .replace(/&/g, ' and ')
      .replace(/[*_~`#]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Returns speech rate (calibrated for Hindi vs English)
  getSpeechRate(isHindi = false) {
    if (isHindi) {
      return parseFloat(this.config.hindiVoiceRate) || 0.85;
    }
    return parseFloat(this.config.voiceRate) || 1.0;
  }

  speak(rawText, callbackOnFinish = null, isHindi = false) {
    this.appendTranscript(this.config.assistantName, rawText, 'jarvis');

    if (!this.synthesis) {
      if (callbackOnFinish) callbackOnFinish();
      return;
    }

    try {
      if (this.synthesis.paused) this.synthesis.resume();
      if (this.synthesis.speaking) this.synthesis.cancel();
    } catch (e) {}

    // In-Ear MCU Audio Chirp
    if (window.audioFX && window.audioFX.playCommsIn) {
      window.audioFX.playCommsIn();
    }

    this.isSpeaking = true;
    this.audioLevel = 1.0;
    this.updateVoiceStatus('TRANSMITTING // SPEAKING');

    const cleanText = this.normalizeSpeechText(rawText);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const isFemale = this.config.voiceGender === 'female';
    
    const basePitch = parseFloat(this.config.voicePitch) || 1.0;
    utterance.pitch = isFemale ? Math.min(1.3, basePitch * 1.1) : basePitch;
    utterance.rate = this.getSpeechRate(isHindi);
    utterance.lang = isHindi ? 'hi-IN' : (this.config.language || 'en-US');

    // Chrome Speech Synthesis GC protection
    window._currentUtterance = utterance;

    const voices = (this.synthesis.getVoices && this.synthesis.getVoices().length > 0) ? this.synthesis.getVoices() : this.voices;

    let preferredVoice = null;
    if (voices && voices.length > 0) {
      if (isHindi) {
        if (isFemale) {
          preferredVoice = voices.find(v => (v.lang && (v.lang.includes('hi') || v.lang.includes('IN'))) && (v.name.includes('Female') || v.name.includes('Swara') || v.name.includes('Kavya') || v.name.includes('Veena') || v.name.includes('Zira') || v.name.includes('Google हिन्दी') || v.name.includes('Kalpana'))) ||
                           voices.find(v => v.lang && (v.lang.includes('hi') || v.lang.includes('IN')));
        } else {
          preferredVoice = voices.find(v => (v.lang && (v.lang.includes('hi') || v.lang.includes('IN'))) && (v.name.includes('Male') || v.name.includes('Hemant') || v.name.includes('Madhav') || v.name.includes('Ravi') || v.name.includes('Lekha'))) ||
                           voices.find(v => v.lang && (v.lang.includes('hi') || v.lang.includes('IN')));
        }
      } else {
        if (isFemale) {
          preferredVoice = voices.find(v => (v.lang && (v.lang.includes('en-GB') || v.lang.includes('en-IE') || v.lang.includes('en-US'))) && (v.name.includes('Female') || v.name.includes('Victoria') || v.name.includes('Samantha') || v.name.includes('Serena') || v.name.includes('Moira') || v.name.includes('Karen') || v.name.includes('Fiona') || v.name.includes('Google UK English Female') || v.name.includes('Siri'))) ||
                           voices.find(v => v.lang && v.lang.includes('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Victoria')));
        } else {
          preferredVoice = voices.find(v => (v.lang && v.lang.includes('en-GB')) || (v.name && (v.name.includes('Daniel') || v.name.includes('Google UK English Male') || v.name.includes('Oliver') || v.name.includes('George')))) ||
                           voices.find(v => v.lang && v.lang.includes('en-US') && !v.name.includes('Female'));
        }
      }
    }

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      this.isSpeaking = false;
      this.audioLevel = 0.1;
      this.updateVoiceStatus(this.continuousMode ? 'LISTENING // READY' : 'STANDBY');

      if (window.audioFX && window.audioFX.playCommsOut) {
        window.audioFX.playCommsOut();
      }

      if (!this.isListening) {
        this.sendMacCommand('UNDUCK_AUDIO');
      }

      if (callbackOnFinish) {
        callbackOnFinish();
      }
    };

    utterance.onerror = (err) => {
      console.warn('[JARVIS TTS] Error:', err);
      this.isSpeaking = false;
      this.updateVoiceStatus(this.continuousMode ? 'LISTENING // READY' : 'STANDBY');
      this.sendMacCommand('UNDUCK_AUDIO');
      if (callbackOnFinish) callbackOnFinish();
    };

    // Direct Speak Dispatch for Desktop & Mobile
    try {
      if (this.synthesis.paused) this.synthesis.resume();
      this.synthesis.speak(utterance);
    } catch (e) {
      console.warn('[JARVIS TTS] Speak exception:', e);
      this.isSpeaking = false;
      if (callbackOnFinish) callbackOnFinish();
    }

    // Safety unfreeze watchdog
    setTimeout(() => {
      if (this.isSpeaking && !this.synthesis.speaking) {
        this.isSpeaking = false;
        this.updateVoiceStatus(this.continuousMode ? 'LISTENING // READY' : 'STANDBY');
      }
    }, 8000);
  }

  setProactivePrompt(question, options = [], defaultAction = null) {
    this.awaitingFollowUp = true;
    this.followUpAction = defaultAction;
    const banner = document.getElementById('proactiveBanner');
    const textEl = document.getElementById('proactiveQuestionText');
    const optionsContainer = document.getElementById('proactiveSuggestions');

    if (!banner || !textEl || !optionsContainer) return;

    textEl.textContent = question;
    optionsContainer.innerHTML = '';

    options.forEach(opt => {
      const chip = document.createElement('button');
      chip.className = 'proactive-chip';
      chip.textContent = opt.text;
      chip.onclick = () => {
        window.audioFX.playClick();
        this.triggerHaptic([20]);
        if (typeof opt.action === 'function') opt.action();
        this.dismissProactive();
      };
      optionsContainer.appendChild(chip);
    });

    banner.classList.remove('hidden');

    // Instantly wake up microphone so user can respond from any background tab
    this.isListening = false;
    this.isStartingRecognition = false;
    try {
      if (this.recognition) this.recognition.stop();
    } catch (e) {}

    setTimeout(() => {
      if (this.awaitingFollowUp && !this.isSpeaking) {
        if (window.audioFX) window.audioFX.playWake();
        this.triggerHaptic([30]);
        this.startListeningSafely();
        this.updateVoiceStatus('AWAITING YOUR ANSWER // SPEAK NOW 🎙️');
      }
    }, 200);
  }

  dismissProactive() {
    this.awaitingFollowUp = false;
    this.followUpAction = null;
    const banner = document.getElementById('proactiveBanner');
    if (banner) banner.classList.add('hidden');
  }

  sendMacCommand(action, params = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'MAC_COMMAND',
        payload: {
          action,
          params,
          originClientId: this.clientId,
          sourceDevice: this.deviceType
        }
      }));
    } else {
      fetch('/api/webhook/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          originClientId: this.clientId,
          sourceDevice: this.deviceType,
          ...params
        })
      });
    }
  }

  async fetchSystemInfo(callback = null) {
    try {
      const res = await fetch('/api/info');
      const data = await res.json();

      if (data.stats) {
        const s = data.stats;
        const cpuUsageVal = document.getElementById('cpuUsageVal');
        const cpuMeter = document.getElementById('cpuMeter');
        const memUsageVal = document.getElementById('memUsageVal');
        const memMeter = document.getElementById('memMeter');
        const battVal = document.getElementById('battVal');
        const battMeter = document.getElementById('battMeter');
        const battStatus = document.getElementById('battStatus');
        const networkIP = document.getElementById('networkIP');
        const qrImg = document.getElementById('qrCodeImg');
        const directUrl = document.getElementById('mobileDirectUrl');

        if (cpuUsageVal) cpuUsageVal.textContent = s.cpuUsage;
        if (cpuMeter) cpuMeter.style.width = `${s.cpuUsage}%`;
        if (memUsageVal) memUsageVal.textContent = s.memUsage;
        if (memMeter) memMeter.style.width = `${s.memUsage}%`;
        if (battVal) battVal.textContent = s.batteryPercent;
        if (battMeter) battMeter.style.width = `${s.batteryPercent}%`;
        if (battStatus) battStatus.textContent = s.isCharging ? '(Charging)' : '(Battery)';
        if (networkIP) networkIP.textContent = `${data.localIP}:${data.port}`;
        if (qrImg && data.qrCodeDataURL) qrImg.src = data.qrCodeDataURL;
        if (directUrl) directUrl.textContent = data.mobileURL;
        if (data.weather) this.renderWeather(data.weather);

        if (callback) callback(s);
      }
    } catch (err) {
      console.warn('Telemetry fetch error:', err);
    }
  }

  // =========================================================
  // ARC REACTOR CANVAS (With Live Oscilloscope Frequency Bars)
  // =========================================================
  initArcReactorCanvas() {
    if (!this.canvas) {
      this.canvas = document.getElementById('arcCanvas');
    }
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

    const baseSize = 380;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = baseSize * dpr;
    this.canvas.height = baseSize * dpr;

    const render = () => {
      if (!this.ctx || !this.canvas) return;

      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.clearRect(0, 0, baseSize, baseSize);

      const cx = baseSize / 2;
      const cy = baseSize / 2;
      this.rotationAngle += 0.015;

      let primaryColor = '#00e5ff';
      let secondaryColor = '#0077aa';
      try {
        const computed = getComputedStyle(document.body);
        primaryColor = computed.getPropertyValue('--primary').trim() || '#00e5ff';
        secondaryColor = computed.getPropertyValue('--secondary').trim() || '#0077aa';
      } catch (e) {}

      // 1. Live Microphone Frequency Oscilloscope Bars
      if (this.analyser && this.frequencyData) {
        try {
          this.analyser.getByteFrequencyData(this.frequencyData);
          const bars = this.frequencyData.length;
          const radius = baseSize * 0.44;

          this.ctx.save();
          this.ctx.translate(cx, cy);
          for (let i = 0; i < bars; i++) {
            const rad = (i * Math.PI * 2) / bars;
            const barHeight = (this.frequencyData[i] / 255) * (baseSize * 0.08);
            const x1 = Math.cos(rad) * radius;
            const y1 = Math.sin(rad) * radius;
            const x2 = Math.cos(rad) * (radius + Math.max(3, barHeight));
            const y2 = Math.sin(rad) * (radius + Math.max(3, barHeight));

            this.ctx.strokeStyle = primaryColor;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
          }
          this.ctx.restore();
        } catch (e) {}
      }

      // 2. Outer Rotating Tech Ring
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(this.rotationAngle);

      this.ctx.strokeStyle = primaryColor;
      this.ctx.lineWidth = 2;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = primaryColor;

      const outerR = baseSize * 0.36;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      this.ctx.stroke();

      const notches = 36;
      for (let i = 0; i < notches; i++) {
        const rad = (i * Math.PI * 2) / notches;
        const len = i % 3 === 0 ? 10 : 5;
        const x1 = Math.cos(rad) * outerR;
        const y1 = Math.sin(rad) * outerR;
        const x2 = Math.cos(rad) * (outerR - len);
        const y2 = Math.sin(rad) * (outerR - len);

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      }
      this.ctx.restore();

      // 3. Counter-Rotating Inner Ring
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(-this.rotationAngle * 1.4);

      this.ctx.strokeStyle = secondaryColor;
      this.ctx.lineWidth = 3;
      const innerR = baseSize * 0.26;
      for (let i = 0; i < 4; i++) {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, innerR, (i * Math.PI) / 2 + 0.2, ((i + 1) * Math.PI) / 2 - 0.2);
        this.ctx.stroke();
      }
      this.ctx.restore();

      // 4. Central Pulsing Plasma Core
      const pulseMultiplier = (this.isSpeaking || this.isListening) ? 1.0 + Math.sin(Date.now() / 120) * 0.15 + this.audioLevel * 0.2 : 1.0;
      const coreRadius = (baseSize * 0.15) * pulseMultiplier;

      const grad = this.ctx.createRadialGradient(cx, cy, 3, cx, cy, coreRadius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, primaryColor);
      grad.addColorStop(0.8, secondaryColor);
      grad.addColorStop(1, 'transparent');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // 5. Central Reactor Triangular Core
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(this.rotationAngle * 0.5);
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;

      this.ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const rad = (i * Math.PI * 2) / 3;
        const nx = Math.cos(rad) * (baseSize * 0.07);
        const ny = Math.sin(rad) * (baseSize * 0.07);
        if (i === 0) this.ctx.moveTo(nx, ny);
        else this.ctx.lineTo(nx, ny);
      }
      this.ctx.closePath();
      this.ctx.stroke();
      this.ctx.restore();

      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('[JARVIS] Screen WakeLock Active.');
      }
    } catch (err) {
      console.warn('[JARVIS] WakeLock error:', err);
    }
  }

  bindEvents() {
    const btnLang = document.getElementById('btnLangToggle');
    if (btnLang) {
      btnLang.onclick = () => {
        window.audioFX.playClick();
        this.triggerHaptic([20]);
        this.toggleLanguage();
      };
    }

    const btnAI = document.getElementById('btnAIToggle');
    if (btnAI) {
      btnAI.onclick = () => {
        window.audioFX.playClick();
        this.triggerHaptic([20]);
        this.toggleAIMode();
      };
    }

    const btnTestKey = document.getElementById('btnTestApiKey');
    if (btnTestKey) {
      btnTestKey.onclick = async () => {
        const keyInput = document.getElementById('cfgGeminiApiKey');
        const statusEl = document.getElementById('keyTestStatus');
        const key = keyInput ? keyInput.value.trim() : '';
        if (!key) {
          if (statusEl) { statusEl.textContent = '❌ Key is empty'; statusEl.style.color = '#ff4444'; }
          return;
        }
        if (statusEl) { statusEl.textContent = 'Testing...'; statusEl.style.color = '#ffb700'; }
        try {
          const res = await fetch('/api/ai/test-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: key })
          });
          const data = await res.json();
          if (data.success) {
            if (statusEl) { statusEl.textContent = '✅ Verified & Online!'; statusEl.style.color = '#00ff88'; }
            window.audioFX.playSuccess();
          } else {
            if (statusEl) { statusEl.textContent = '❌ Invalid Key'; statusEl.style.color = '#ff4444'; }
          }
        } catch (e) {
          if (statusEl) { statusEl.textContent = '❌ Connection Failed'; statusEl.style.color = '#ff4444'; }
        }
      };
    }

    const btnClearMem = document.getElementById('btnClearLearnedMemory');
    if (btnClearMem) {
      btnClearMem.onclick = async () => {
        window.audioFX.playClick();
        try {
          await fetch('/api/learned-intents', { method: 'DELETE' });
          this.learnedIntents = [];
          const countEl = document.getElementById('learnedCount');
          if (countEl) countEl.textContent = '0';
          this.speak('Offline learned neural memory cleared.');
        } catch (e) {}
      };
    }

    let lastMicTriggerTime = 0;
    const triggerMic = async (e) => {
      if (e) {
        try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
      }
      const now = Date.now();
      if (now - lastMicTriggerTime < 500) return;
      lastMicTriggerTime = now;

      window.audioFX.playWake();
      this.triggerHaptic([40]);

      await this.unlockMobileAudioAndMic();

      if (this.recognition) {
        if (this.isListening) {
          try { this.recognition.stop(); } catch(err) {}
        } else {
          try { this.recognition.abort(); } catch (err) {}
          this.isListening = false;
          this.isStartingRecognition = false;
          setTimeout(() => {
            this.startListeningSafely();
          }, 60);
        }
      }
    };

    if (micBtn) {
      micBtn.onclick = (e) => triggerMic(e);
      micBtn.addEventListener('touchend', (e) => triggerMic(e), { passive: false });
    }
    if (arcWrapper) {
      arcWrapper.onclick = (e) => triggerMic(e);
      arcWrapper.addEventListener('touchend', (e) => triggerMic(e), { passive: false });
    }

    const contBtn = document.getElementById('btnContinuousToggle');
    if (contBtn) {
      contBtn.onclick = () => {
        this.continuousMode = !this.continuousMode;
        contBtn.textContent = `CONTINUOUS: ${this.continuousMode ? 'ON' : 'OFF'}`;
        contBtn.classList.toggle('active', this.continuousMode);
        window.audioFX.playClick();
        this.triggerHaptic([20]);
      };
    }

    const wakeBtn = document.getElementById('btnKeepAwake');
    if (wakeBtn) {
      wakeBtn.onclick = () => {
        this.requestWakeLock();
        wakeBtn.classList.toggle('active');
        window.audioFX.playClick();
        this.triggerHaptic([20]);
      };
    }

    const btnPair = document.getElementById('btnPairPhone');
    if (btnPair) {
      btnPair.onclick = () => {
        window.audioFX.playClick();
        this.openModal('modalPair');
        this.fetchSystemInfo();
      };
    }

    const btnClip = document.getElementById('btnClipboardSync');
    if (btnClip) {
      btnClip.onclick = () => {
        window.audioFX.playClick();
        this.openModal('modalClipboard');
        pullClipboardFromMac();
      };
    }

    const btnNotes = document.getElementById('btnNotesToggle');
    if (btnNotes) {
      btnNotes.onclick = () => {
        window.audioFX.playClick();
        this.openModal('modalNotes');
        this.fetchNotes();
      };
    }

    const btnCamera = document.getElementById('btnCameraHUD');
    if (btnCamera) {
      btnCamera.onclick = () => {
        window.audioFX.playClick();
        this.startCameraScanner();
      };
    }

    const btnSettings = document.getElementById('btnSettings');
    if (btnSettings) {
      btnSettings.onclick = () => {
        window.audioFX.playClick();
        this.openModal('modalSettings');
      };
    }

    const btnAudio = document.getElementById('btnAudioToggle');
    if (btnAudio) {
      btnAudio.onclick = () => {
        window.audioFX.muted = !window.audioFX.muted;
        btnAudio.style.opacity = window.audioFX.muted ? '0.4' : '1';
      };
    }

    const addNoteForm = document.getElementById('addNoteForm');
    const noteInput = document.getElementById('noteInputText');
    if (addNoteForm && noteInput) {
      addNoteForm.onsubmit = (e) => {
        e.preventDefault();
        const val = noteInput.value.trim();
        if (val) {
          this.addNote(val);
          noteInput.value = '';
        }
      };
    }

    const textForm = document.getElementById('textCommandForm');
    const textInput = document.getElementById('manualTextInput');
    if (textForm && textInput) {
      textForm.onsubmit = (e) => {
        e.preventDefault();
        const val = textInput.value.trim();
        if (val) {
          this.handleUserInput(val);
          textInput.value = '';
        }
      };
    }

    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
      settingsForm.onsubmit = (e) => {
        e.preventDefault();
        const updated = {
          assistantName: document.getElementById('cfgAssistantName').value || 'J.A.R.V.I.S.',
          userTitle: document.getElementById('cfgUserTitle').value || 'Sir',
          language: document.getElementById('cfgVoiceLang').value,
          voicePitch: parseFloat(document.getElementById('cfgVoicePitch').value) || 1.0,
          voiceRate: parseFloat(document.getElementById('cfgVoiceRate').value) || 1.0,
          hindiVoiceRate: parseFloat(document.getElementById('cfgHindiVoiceRate') ? document.getElementById('cfgHindiVoiceRate').value : 0.85) || 0.85,
          voiceGender: document.getElementById('cfgVoiceGender') ? document.getElementById('cfgVoiceGender').value : 'male',
          geminiApiKey: document.getElementById('cfgGeminiApiKey') ? document.getElementById('cfgGeminiApiKey').value.trim() : '',
          autoTrain: document.getElementById('cfgAutoTrain') ? document.getElementById('cfgAutoTrain').checked : true,
          aiMode: this.config.aiMode !== false
        };
        this.currentLanguage = updated.language;
        localStorage.setItem('jarvis_lang', updated.language);
        this.applyConfig(updated);
        this.saveConfigToServer(updated);
        this.closeModal('modalSettings');
        this.updateLanguageUI();
        this.speak(`Configuration updated, ${updated.userTitle}. Hybrid AI persona calibrated.`);
      };
    }

    const btnCloseProactive = document.getElementById('btnCloseProactive');
    if (btnCloseProactive) {
      btnCloseProactive.onclick = () => this.dismissProactive();
    }
  }

  toggleSentryMode() {
    this.config.sentryMode = !this.config.sentryMode;
    const banner = document.getElementById('sentryStatusBanner');
    if (banner) banner.classList.toggle('hidden', !this.config.sentryMode);
    const protoBtn = document.getElementById('btnFocusProto');
    if (protoBtn) protoBtn.classList.toggle('active', this.config.sentryMode);

    if (this.config.sentryMode) {
      window.audioFX.playAlert();
      this.triggerHaptic([100, 50, 100]);
      this.speak(`Sentry Surveillance Mode engaged, ${this.config.userTitle}.`);
    } else {
      this.speak(`Sentry Surveillance Mode deactivated, ${this.config.userTitle}.`);
    }
  }

  triggerSentryAlarm() {
    window.audioFX.playAlert();
    this.triggerHaptic([200, 100, 200]);
    this.speak(`Warning! Unauthorized intruder detected at workstation!`);
  }

  triggerEmergencySOS() {
    window.audioFX.playAlert();
    this.triggerHaptic([300, 100, 300, 100, 300]);
    this.speak(`Emergency SOS protocol triggered! Dispatching coordinates.`);
    this.executeDirectCall();
  }

  updateVoiceStatus(text) {
    const el = document.getElementById('voiceStatusText');
    if (el) el.textContent = text;
  }

  updateNetworkBadge(isOnline) {
    const badge = document.querySelector('.network-ping');
    if (badge) {
      badge.innerHTML = `<span class="ping-dot" style="background:${isOnline ? 'var(--success)' : 'var(--danger)'}"></span> ${isOnline ? 'WEBSOCKET SYNCED' : 'OFFLINE // RETRYING'}`;
    }
  }

  appendTranscript(speaker, text, role = 'jarvis') {
    const feed = document.getElementById('transcriptFeed');
    if (!feed) return;

    const item = document.createElement('div');
    item.className = `feed-item ${role}`;
    item.innerHTML = `<span class="speaker-tag">${speaker}:</span> <span class="msg-content">${text}</span>`;

    feed.appendChild(item);
    feed.scrollTop = feed.scrollHeight;
  }

  promptManualInput(prefix = '') {
    const input = document.getElementById('manualTextInput');
    if (input) {
      input.value = prefix;
      input.focus();
    }
  }

  applyConfig(cfg) {
    this.config = { ...this.config, ...cfg };

    const headerName = document.getElementById('headerAssistantName');
    if (headerName) headerName.textContent = this.config.assistantName;

    const inputName = document.getElementById('cfgAssistantName');
    if (inputName) inputName.value = this.config.assistantName;

    const inputTitle = document.getElementById('cfgUserTitle');
    if (inputTitle) inputTitle.value = this.config.userTitle;

    const selectGender = document.getElementById('cfgVoiceGender');
    if (selectGender && this.config.voiceGender) selectGender.value = this.config.voiceGender;

    const hindiRateInput = document.getElementById('cfgHindiVoiceRate');
    const valHindiRate = document.getElementById('valHindiRate');
    if (hindiRateInput && this.config.hindiVoiceRate) {
      hindiRateInput.value = this.config.hindiVoiceRate;
      if (valHindiRate) valHindiRate.textContent = `${this.config.hindiVoiceRate}x`;
    }

    const engRateInput = document.getElementById('cfgVoiceRate');
    const valEngRate = document.getElementById('valEngRate');
    if (engRateInput && this.config.voiceRate) {
      engRateInput.value = this.config.voiceRate;
      if (valEngRate) valEngRate.textContent = `${this.config.voiceRate}x`;
    }

    if (this.config.language) {
      this.currentLanguage = this.config.language;
      this.updateLanguageUI();
    }

    if (this.config.theme) {
      document.body.className = this.config.theme;
    }

    const geminiInput = document.getElementById('cfgGeminiApiKey');
    if (geminiInput && this.config.geminiApiKey !== undefined) {
      geminiInput.value = this.config.geminiApiKey;
    }

    const autoTrainCheck = document.getElementById('cfgAutoTrain');
    if (autoTrainCheck && this.config.autoTrain !== undefined) {
      autoTrainCheck.checked = !!this.config.autoTrain;
    }

    const aiBadge = document.getElementById('aiBadge');
    const btnAI = document.getElementById('btnAIToggle');
    if (aiBadge) {
      aiBadge.textContent = this.config.aiMode !== false ? '🤖 AI: ON' : '🤖 AI: OFF';
    }
    if (btnAI) {
      btnAI.classList.toggle('active', this.config.aiMode !== false);
    }

    const learnedCountEl = document.getElementById('learnedCount');
    if (learnedCountEl) {
      learnedCountEl.textContent = this.learnedIntents ? this.learnedIntents.length : 0;
    }
  }

  saveConfigToServer(cfg) {
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
  }

  openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('hidden');
  }

  closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('hidden');
  }
}

// Global helper instances
window.jarvis = new JarvisCore();

function executeProtocol(protoType) {
  window.audioFX.playClick();
  if (protoType === 'morning') {
    window.jarvis.executeMorningProtocol();
  } else if (protoType === 'focus') {
    const isPlaying = window.audioFX.toggleFocusAmbience();
    const banner = document.getElementById('ambienceStatusBanner');
    if (banner) banner.classList.toggle('hidden', !isPlaying);
    const protoBtn = document.getElementById('btnFocusProto');
    if (protoBtn) protoBtn.classList.toggle('active', isPlaying);
  } else if (protoType === 'sentry') {
    window.jarvis.toggleSentryMode();
  } else if (protoType === 'sos') {
    window.jarvis.triggerEmergencySOS();
  } else if (protoType === 'clean') {
    clearTranscript();
    window.audioFX.stopFocusAmbience();
    window.jarvis.speak(`Command console cleared and systems reset, ${window.jarvis.config.userTitle}.`);
  }
}

function pushClipboardToMac() {
  const text = document.getElementById('clipboardTextArea').value;
  fetch('/api/clipboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  }).then(() => {
    window.audioFX.playSuccess();
    window.jarvis.speak(`Clipboard synced to Mac.`);
  });
}

function pullClipboardFromMac() {
  fetch('/api/clipboard').then(res => res.json()).then(data => {
    const el = document.getElementById('clipboardTextArea');
    if (el) el.value = data.text || '';
    window.audioFX.playClick();
  });
}

function stopCameraScanner() {
  window.audioFX.playClick();
  window.jarvis.stopCameraScanner();
}

function executeAppSearch(appType) {
  window.audioFX.playClick();
  window.jarvis.triggerHaptic([30]);
  let query = '';
  if (appType === 'youtube') {
    query = prompt('Enter song or video name for YouTube:', 'Arijit Singh');
    if (query === null) return;
    window.jarvis.playYouTube(query.trim() || 'trending hindi songs');
  } else if (appType === 'spotify') {
    query = prompt('Enter track or artist for Spotify:', 'Arijit Singh');
    if (query === null) return;
    window.jarvis.openAppSearch('spotify', query.trim() || 'Arijit Singh');
  } else if (appType === 'maps') {
    query = prompt('Enter navigation destination for Maps:', 'Near me');
    if (query === null) return;
    window.jarvis.openAppSearch('maps', query.trim() || 'Restaurants near me');
  } else if (appType === 'whatsapp') {
    query = prompt('Enter contact name or message for WhatsApp:', '');
    if (query === null) return;
    window.jarvis.openAppSearch('whatsapp', query.trim());
  } else if (appType === 'chrome') {
    query = prompt('Enter Google search term:', '');
    if (query === null) return;
    window.jarvis.openAppSearch('chrome', query.trim());
  }
}

function executeDirectCall() {
  window.audioFX.playClick();
  window.jarvis.executeDirectCall();
}

function sendMacCommand(action, params = {}) {
  window.audioFX.playClick();
  window.jarvis.sendMacCommand(action, params);
}

function adjustMacVolume(level) {
  const txt = document.getElementById('volLevelTxt');
  if (txt) txt.textContent = `${level}%`;
  window.jarvis.sendMacCommand('SET_VOLUME', { level: parseInt(level) });
}

function clearTranscript() {
  const feed = document.getElementById('transcriptFeed');
  if (feed) feed.innerHTML = '';
}

function closeModal(id) {
  window.jarvis.closeModal(id);
}

function skipAd() {
  window.audioFX.playClick();
  window.jarvis.sendMacCommand('SKIP_AD');
  window.jarvis.speak('YouTube ad skipped.');
}

function quickVoiceTrigger(phrase) {
  window.audioFX.playWake();
  window.jarvis.triggerHaptic([30]);
  window.jarvis.unlockMobileAudioAndMic();
  window.jarvis.handleUserInput(phrase);
}

function autoUpdatePersonaName(gender) {
  const nameInput = document.getElementById('cfgAssistantName');
  if (nameInput) {
    if (gender === 'female' && nameInput.value === 'J.A.R.V.I.S.') {
      nameInput.value = 'F.R.I.D.A.Y.';
    } else if (gender === 'male' && nameInput.value === 'F.R.I.D.A.Y.') {
      nameInput.value = 'J.A.R.V.I.S.';
    }
  }
}

function setTheme(themeClass) {
  document.body.className = themeClass;
  window.jarvis.config.theme = themeClass;
  window.jarvis.saveConfigToServer({ theme: themeClass });
  window.audioFX.playClick();
}
