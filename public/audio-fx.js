// Sci-Fi Web Audio Synthesizer & Focus Soundscape Generator for J.A.R.V.I.S.
// 100% Native Web Audio API (Zero External Audio Files)

class JarvisAudioFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.unlocked = false;
    this.ambienceNodes = null;
    this.isAmbiencePlaying = false;
    this.setupMobileUnlock();
  }

  setupMobileUnlock() {
    const unlockEvents = ['touchstart', 'touchend', 'click', 'keydown'];
    const unlock = () => {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.unlocked = true;
          console.log('[JARVIS AUDIO] AudioContext unlocked.');
        });
      } else if (this.ctx && this.ctx.state === 'running') {
        this.unlocked = true;
      }
      unlockEvents.forEach(e => document.removeEventListener(e, unlock));
    };

    unlockEvents.forEach(e => document.addEventListener(e, unlock, { once: true, passive: true }));
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Futuristic Startup Power-on sound
  playBoot() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.6);

    osc2.frequency.setValueAtTime(300, now);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.6);

    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.85);
    osc2.stop(now + 0.85);
  }

  // High-frequency wake chime
  playWake() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.08); // A5
    osc.frequency.setValueAtTime(1174.66, now + 0.16); // D6

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Acknowledgment double-beep
  playSuccess() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(783.99, now); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.07); // C6

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Processing frequency sweep
  playProcessing() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(660, now + 0.15);
    osc.frequency.linearRampToValueAtTime(440, now + 0.3);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Subtle HUD click
  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Pre-Speech Sub-Audible Radio Comms Chirp (Iron Man Earpiece Link)
  playCommsIn() {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {}
  }

  // Post-Speech Soft Comms Disconnect
  playCommsOut() {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.03);
    } catch (e) {}
  }

  // Sentry Intruder alarm
  playAlert() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + i * 0.25;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, startTime);
      osc.frequency.exponentialRampToValueAtTime(450, startTime + 0.2);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.23);
    }
  }

  // =========================================================
  // STARK FOCUS AMBIENT SOUNDSCAPE (Binaural Harmonic Generator)
  // =========================================================
  startFocusAmbience() {
    this.init();
    if (!this.ctx) return;
    if (this.isAmbiencePlaying) return;

    const now = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.12, now + 2.0); // Smooth 2s fade in

    // Binaural Beats: Left Ear 216Hz, Right Ear 222Hz (Delta-Theta Focus 6Hz difference)
    const oscL = this.ctx.createOscillator();
    const oscR = this.ctx.createOscillator();
    const subBass = this.ctx.createOscillator();

    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(216, now);

    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(222, now);

    subBass.type = 'triangle';
    subBass.frequency.setValueAtTime(108, now);

    // Warm Low-pass Filter for Cyberpunk Ambience feel
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    oscL.connect(filter);
    oscR.connect(filter);
    subBass.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    oscL.start(now);
    oscR.start(now);
    subBass.start(now);

    this.ambienceNodes = { oscL, oscR, subBass, masterGain };
    this.isAmbiencePlaying = true;
    console.log('[JARVIS AUDIO] Focus Binaural Ambience Active.');
  }

  stopFocusAmbience() {
    if (!this.isAmbiencePlaying || !this.ambienceNodes || !this.ctx) return;

    const now = this.ctx.currentTime;
    const { oscL, oscR, subBass, masterGain } = this.ambienceNodes;

    // Smooth 1.5s fade out
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0.001, now + 1.5);

    setTimeout(() => {
      try {
        oscL.stop();
        oscR.stop();
        subBass.stop();
      } catch (e) {}
      this.ambienceNodes = null;
      this.isAmbiencePlaying = false;
      console.log('[JARVIS AUDIO] Focus Ambience Deactivated.');
    }, 1600);
  }

  toggleFocusAmbience() {
    if (this.isAmbiencePlaying) {
      this.stopFocusAmbience();
      return false;
    } else {
      this.startFocusAmbience();
      return true;
    }
  }
}

window.audioFX = new JarvisAudioFX();
