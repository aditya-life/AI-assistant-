// =========================================================
// J.A.R.V.I.S. YOUTUBE SENTINEL & DIRECT MEDIA BRIDGE v2.0
// Autonomous Ad Neutralizer, Auto-HD/4K Enforcer & Stark HUD
// Cross-Browser Compatible: Apple Safari & Google Chrome
// =========================================================

(function() {
  'use strict';

  console.log('[JARVIS SENTINEL v2.0] Active. Armed for ad neutralization & resolution mastery.');

  // Extension API Polyfill
  const browserAPI = typeof chrome !== 'undefined' && chrome.runtime ? chrome : (typeof browser !== 'undefined' ? browser : null);

  // Configuration State
  let config = {
    preferredResolution: 'auto',
    autoSkipAds: true,
    autoDismissDialogs: true,
    hideAdBanners: true,
    showPlayerHUD: true,
    volumeBoost: 1.0,
    wsUrl: 'wss://127.0.0.1:3000/ws'
  };

  let currentQuality = 'unknown';
  let availableQualities = [];
  let wasMutedBySentinel = false;
  let previousPlaybackRate = 1.0;
  let audioCtx = null;
  let gainNode = null;
  let audioSourceNode = null;

  // Load Saved Configuration from Storage
  if (browserAPI && browserAPI.storage && browserAPI.storage.local) {
    browserAPI.storage.local.get(config, (items) => {
      if (items) {
        config = { ...config, ...items };
        applyAudioGain(config.volumeBoost);
        applyResolutionPreference(config.preferredResolution);
      }
    });

    // Listen for live config updates from Popup
    if (browserAPI.storage.onChanged) {
      browserAPI.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
          for (const [key, val] of Object.entries(changes)) {
            config[key] = val.newValue;
          }
          if (changes.preferredResolution) {
            applyResolutionPreference(changes.preferredResolution.newValue);
          }
          if (changes.volumeBoost) {
            applyAudioGain(changes.volumeBoost.newValue);
          }
          if (changes.showPlayerHUD) {
            updateHUDVisibility();
          }
        }
      });
    }
  }

  // =========================================================
  // 1. INJECT MAIN-WORLD SCRIPT (Direct YouTube Player API Bridge)
  // =========================================================
  function injectMainWorldBridge() {
    try {
      const script = document.createElement('script');
      if (browserAPI && browserAPI.runtime && browserAPI.runtime.getURL) {
        script.src = browserAPI.runtime.getURL('inject.js');
      } else {
        script.src = 'inject.js';
      }
      script.onload = () => script.remove();
      (document.head || document.documentElement).appendChild(script);
      console.log('[JARVIS SENTINEL] Main-world bridge injected successfully.');
    } catch (e) {
      console.warn('[JARVIS SENTINEL] Inject bridge warning:', e);
    }
  }

  injectMainWorldBridge();

  // Listen for Player Updates from inject.js
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.source !== 'JARVIS_SENTINEL_INJECT') return;

    if (event.data.type === 'QUALITY_UPDATE' && event.data.payload) {
      const { currentQuality: q, availableQualities: aq } = event.data.payload;
      if (q) currentQuality = q;
      if (Array.isArray(aq)) availableQualities = aq;
      updatePlayerHUDBadge();
    }
  });

  function applyResolutionPreference(quality) {
    window.postMessage({
      source: 'JARVIS_SENTINEL_CS',
      type: 'SET_RESOLUTION',
      payload: { quality: quality || config.preferredResolution }
    }, '*');
  }

  function applyPlaybackSpeed(speed) {
    window.postMessage({
      source: 'JARVIS_SENTINEL_CS',
      type: 'SET_PLAYBACK_SPEED',
      payload: { speed: speed }
    }, '*');
  }

  // =========================================================
  // 2. ULTRA-SAFE AD NEUTRALIZER (Fixes Settings Menu Freeze)
  // =========================================================

  // Critical Check: Determine if the player settings menu or any dropdown is currently open
  function isPlayerMenuOpen() {
    // 1. YouTube native settings gear popup
    const settingsMenu = document.querySelector('.ytp-settings-menu, .ytp-popup.ytp-settings-menu');
    if (settingsMenu && settingsMenu.offsetParent !== null && getComputedStyle(settingsMenu).display !== 'none') {
      return true;
    }
    // 2. Any active panels or submenus inside the player
    const panels = document.querySelectorAll('.ytp-panel-menu');
    for (const p of panels) {
      if (p.offsetParent !== null && getComputedStyle(p).display !== 'none') {
        return true;
      }
    }
    // 3. User is actively hovering or focusing settings button
    const settingsBtn = document.querySelector('.ytp-settings-button');
    if (settingsBtn && (document.activeElement === settingsBtn || settingsBtn.getAttribute('aria-expanded') === 'true')) {
      return true;
    }
    return false;
  }

  function neutralizeAds() {
    if (!config.autoSkipAds) return;

    try {
      const player = document.querySelector('#movie_player, .html5-video-player');
      const isAd = player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'));
      const adVideo = document.querySelector('video');

      // 2A. Verified Ad Skip Buttons
      const skipSelectors = [
        '.ytp-ad-skip-button-modern',
        '.ytp-ad-skip-button',
        '.ytp-skip-ad-button',
        '.ytp-ad-skip-button-slot button',
        'button.ytp-ad-skip-button-modern',
        '.ytp-ad-overlay-close-button'
      ];

      for (const selector of skipSelectors) {
        const buttons = document.querySelectorAll(selector);
        for (const btn of buttons) {
          if (btn && btn.offsetParent !== null && getComputedStyle(btn).display !== 'none') {
            btn.click();
            console.log('[JARVIS SENTINEL] Verified Skip Button Clicked!');
          }
        }
      }

      // 2B. Fast-forward Video Ad Stream Instantly
      if (isAd && adVideo) {
        if (!wasMutedBySentinel) {
          previousPlaybackRate = adVideo.playbackRate || 1.0;
          wasMutedBySentinel = true;
        }
        adVideo.muted = true;
        if (!isNaN(adVideo.duration) && adVideo.duration > 0) {
          adVideo.currentTime = adVideo.duration + 2;
          adVideo.playbackRate = 16.0;
        }
      } else if (!isAd && wasMutedBySentinel && adVideo) {
        // Restore audio & speed once ad finishes
        wasMutedBySentinel = false;
        adVideo.muted = false;
        adVideo.playbackRate = previousPlaybackRate || 1.0;
      }

      // 2C. SAFE Dialog & Overlay Dismissal
      // IMPORTANT: DO NOT execute dismiss clicks if user is inside the Settings menu!
      if (!isPlayerMenuOpen() && config.autoDismissDialogs) {
        // Handle "Video paused. Continue watching?" prompt safely
        const confirmDialog = document.querySelector('yt-confirm-dialog-renderer');
        if (confirmDialog && confirmDialog.offsetParent !== null && getComputedStyle(confirmDialog).display !== 'none') {
          const text = (confirmDialog.textContent || '').toLowerCase();
          if (text.includes('watching') || text.includes('paused') || text.includes('continue')) {
            const confirmBtn = confirmDialog.querySelector('#confirm-button button, #confirm-button');
            if (confirmBtn && confirmBtn.offsetParent !== null) {
              confirmBtn.click();
              console.log('[JARVIS SENTINEL] Auto-resumed "Continue watching" prompt.');
            }
          }
        }

        // Handle YouTube Anti-Adblock modal cleanly without closing normal menus
        const enforcementModal = document.querySelector('ytd-enforcement-message-view-model');
        if (enforcementModal && enforcementModal.offsetParent !== null) {
          const dismissBtn = enforcementModal.querySelector('#dismiss-button button, button[aria-label*="Dismiss"]');
          if (dismissBtn && dismissBtn.offsetParent !== null) {
            dismissBtn.click();
          } else {
            const dialogParent = enforcementModal.closest('tp-yt-paper-dialog') || enforcementModal;
            dialogParent.remove();
            document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(b => b.remove());
            if (adVideo && adVideo.paused) adVideo.play().catch(() => {});
          }
        }
      }

    } catch (err) {
      // Silent safe fail
    }
  }

  // Throttled Neutralization with requestAnimationFrame (eliminates CPU spikes in Safari)
  let rafId = null;
  function scheduleNeutralization() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      neutralizeAds();
    });
  }

  // Observe DOM mutations safely
  const observer = new MutationObserver((mutations) => {
    // Skip mutations generated inside settings menu or Jarvis HUD to prevent loop
    for (let i = 0; i < mutations.length; i++) {
      const target = mutations[i].target;
      if (target && target.closest && (target.closest('.ytp-settings-menu') || target.closest('.jarvis-res-menu') || target.closest('.jarvis-res-btn'))) {
        return;
      }
    }
    scheduleNeutralization();
  });

  function startObserver() {
    const target = document.getElementById('movie_player') || document.body || document.documentElement;
    observer.observe(target, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }

  // Low-frequency safety poll (300ms instead of aggressive 50ms)
  setInterval(() => {
    const player = document.querySelector('#movie_player, .html5-video-player');
    if (player && (player.classList.contains('ad-showing') || document.querySelector('.ytp-ad-skip-button-modern, .ytp-ad-skip-button'))) {
      neutralizeAds();
    }
  }, 300);

  // =========================================================
  // 3. J.A.R.V.I.S. ON-PLAYER RESOLUTION HUD
  // =========================================================
  let hudButton = null;
  let hudMenu = null;
  let hudToast = null;

  function formatQualityLabel(q) {
    if (!q || q === 'unknown' || q === 'auto') return 'Auto';
    const clean = q.toLowerCase();
    if (clean === 'highres' || clean === '4320p' || clean === '8k') return '8K';
    if (clean === 'hd2880') return '5K';
    if (clean === 'hd2160' || clean === '4k' || clean === '2160p') return '4K';
    if (clean === 'hd1440' || clean === '1440p' || clean === '2k') return '1440p';
    if (clean === 'hd1080' || clean === '1080p') return '1080p';
    if (clean === 'hd720' || clean === '720p') return '720p';
    if (clean === 'large' || clean === '480p') return '480p';
    if (clean === 'medium' || clean === '360p') return '360p';
    if (clean === 'small' || clean === '240p') return '240p';
    if (clean === 'tiny' || clean === '144p') return '144p';
    return q.toUpperCase();
  }

  function showHUDToast(text) {
    const player = document.querySelector('#movie_player, .html5-video-player');
    if (!player) return;

    if (!hudToast) {
      hudToast = document.createElement('div');
      hudToast.className = 'jarvis-hud-toast';
      player.appendChild(hudToast);
    }

    hudToast.innerHTML = `<span>⚡</span> <span>${text}</span>`;
    hudToast.classList.add('show');

    clearTimeout(hudToast._timer);
    hudToast._timer = setTimeout(() => {
      hudToast.classList.remove('show');
    }, 2200);
  }

  function updatePlayerHUDBadge() {
    if (!hudButton) return;
    const badge = hudButton.querySelector('.jarvis-res-text');
    if (badge) {
      const label = formatQualityLabel(currentQuality);
      badge.textContent = label;
    }

    if (hudMenu) {
      const items = hudMenu.querySelectorAll('.jarvis-menu-item');
      items.forEach(item => {
        const q = item.getAttribute('data-quality');
        const isMatch = (q === config.preferredResolution) ||
                        (q === 'auto' && config.preferredResolution === 'auto');
        item.classList.toggle('active', isMatch);
      });
    }
  }

  function injectPlayerHUD() {
    if (!config.showPlayerHUD) return;
    if (document.querySelector('.jarvis-res-btn')) return;

    const rightControls = document.querySelector('.ytp-right-controls');
    const player = document.querySelector('#movie_player, .html5-video-player');
    if (!rightControls || !player) return;

    // Create Button
    hudButton = document.createElement('button');
    hudButton.className = 'ytp-button jarvis-res-btn';
    hudButton.setAttribute('title', 'J.A.R.V.I.S. Quality Sentinel');
    hudButton.setAttribute('aria-label', 'J.A.R.V.I.S. Resolution Switcher');
    hudButton.innerHTML = `
      <div class="jarvis-res-pill">
        <span class="jarvis-res-icon">⚡</span>
        <span class="jarvis-res-text">${formatQualityLabel(currentQuality)}</span>
        <span class="jarvis-res-caret">▼</span>
      </div>
    `;

    // Create Menu
    hudMenu = document.createElement('div');
    hudMenu.className = 'jarvis-res-menu';
    hudMenu.innerHTML = `
      <div class="jarvis-menu-header">
        <span>JARVIS RESOLUTION</span>
      </div>
      <button class="jarvis-menu-item" data-quality="auto">Auto (Default)</button>
      <button class="jarvis-menu-item" data-quality="4320p">8K Ultra HD</button>
      <button class="jarvis-menu-item" data-quality="2160p">4K UHD (2160p)</button>
      <button class="jarvis-menu-item" data-quality="1440p">2K QHD (1440p)</button>
      <button class="jarvis-menu-item" data-quality="1080p">1080p Full HD</button>
      <button class="jarvis-menu-item" data-quality="720p">720p HD</button>
      <button class="jarvis-menu-item" data-quality="480p">480p SD</button>
    `;

    // Toggle menu
    hudButton.addEventListener('click', (e) => {
      e.stopPropagation();
      hudMenu.classList.toggle('open');
    });

    // Handle Option Click
    hudMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = e.target.closest('.jarvis-menu-item');
      if (!item) return;

      const targetQuality = item.getAttribute('data-quality');
      config.preferredResolution = targetQuality;

      if (browserAPI && browserAPI.storage && browserAPI.storage.local) {
        browserAPI.storage.local.set({ preferredResolution: targetQuality });
      }

      applyResolutionPreference(targetQuality);
      showHUDToast(`J.A.R.V.I.S.: Resolution set to ${formatQualityLabel(targetQuality)}`);
      hudMenu.classList.remove('open');
      updatePlayerHUDBadge();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (hudMenu && !hudMenu.contains(e.target) && !hudButton.contains(e.target)) {
        hudMenu.classList.remove('open');
      }
    });

    // Insert before the settings button for natural placement
    const settingsBtn = rightControls.querySelector('.ytp-settings-button');
    if (settingsBtn) {
      rightControls.insertBefore(hudButton, settingsBtn);
    } else {
      rightControls.appendChild(hudButton);
    }

    player.appendChild(hudMenu);
    updatePlayerHUDBadge();
  }

  function updateHUDVisibility() {
    if (hudButton) hudButton.style.display = config.showPlayerHUD ? 'inline-flex' : 'none';
    if (hudMenu && !config.showPlayerHUD) hudMenu.classList.remove('open');
    if (config.showPlayerHUD && !hudButton) injectPlayerHUD();
  }

  setInterval(injectPlayerHUD, 1500);

  // =========================================================
  // 4. WEB AUDIO BOOSTER (Up to 300% Gain)
  // =========================================================
  function applyAudioGain(factor) {
    try {
      const mult = parseFloat(factor);
      if (isNaN(mult) || mult < 1.0) return;

      const video = document.querySelector('video');
      if (!video) return;

      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        audioCtx = new AudioContextClass();
        audioSourceNode = audioCtx.createMediaElementSource(video);
        gainNode = audioCtx.createGain();
        audioSourceNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);
      }

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      if (gainNode) {
        gainNode.gain.setValueAtTime(mult, audioCtx.currentTime);
        console.log(`[JARVIS SENTINEL] Audio gain set to ${Math.round(mult * 100)}%`);
      }
    } catch (e) {
      // AudioContext already connected or cross-origin safe error
    }
  }

  // =========================================================
  // 5. HIGH-DEF FRAME CAPTURE (Screenshot)
  // =========================================================
  function captureVideoFrame() {
    const video = document.querySelector('video');
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const title = (document.title || 'YouTube').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
      const filename = `JARVIS_${title}_${Date.now()}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();

      showHUDToast('HD Frame Captured!');
    } catch (e) {
      console.warn('[JARVIS SENTINEL] Frame capture error:', e);
    }
  }

  // =========================================================
  // 6. PICTURE-IN-PICTURE (PiP)
  // =========================================================
  function togglePictureInPicture() {
    const video = document.querySelector('video');
    if (!video) return;

    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (video.requestPictureInPicture) {
      video.requestPictureInPicture().catch(() => {});
    } else if (video.webkitSetPresentationMode) {
      // Safari specific PiP
      video.webkitSetPresentationMode(video.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture');
    }
  }

  // =========================================================
  // 7. DIRECT WEBSOCKET MEDIA BRIDGE TO LOCAL J.A.R.V.I.S. CORE
  // =========================================================
  let ws = null;
  let wsRetryDelay = 2000;

  function connectJarvisBridge() {
    try {
      const targetUrl = config.wsUrl || 'wss://127.0.0.1:3000/ws';
      ws = new WebSocket(targetUrl);

      ws.onopen = () => {
        console.log('[JARVIS SENTINEL] Connected to Stark Central Mainframe WebSocket.');
        wsRetryDelay = 2000;
        ws.send(JSON.stringify({
          type: 'SENTINEL_HANDSHAKE',
          device: 'youtube_sentinel_tab',
          browser: 'safari_or_chrome',
          version: '2.0.0',
          title: document.title,
          url: window.location.href,
          currentQuality: currentQuality
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'COMMAND' && msg.payload) {
            handleRemoteCommand(msg.payload.action, msg.payload.params || {});
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        // Try ws:// fallback if wss:// fails on localhost
        if (config.wsUrl && config.wsUrl.startsWith('wss://127.0.0.1') && wsRetryDelay > 4000) {
          config.wsUrl = 'ws://127.0.0.1:3000/ws';
        }
        wsRetryDelay = Math.min(10000, wsRetryDelay * 1.5);
        setTimeout(connectJarvisBridge, wsRetryDelay);
      };

      ws.onerror = () => {
        if (ws) ws.close();
      };

    } catch (e) {
      setTimeout(connectJarvisBridge, 5000);
    }
  }

  function handleRemoteCommand(action, params) {
    const video = document.querySelector('video');

    switch (action) {
      case 'MEDIA_PAUSE':
        if (video) video.pause();
        break;
      case 'MEDIA_RESUME':
      case 'MEDIA_PLAY':
        if (video) video.play();
        break;
      case 'MEDIA_RESTART':
        if (video) { video.currentTime = 0; video.play(); }
        break;
      case 'MEDIA_SEEK': {
        const sec = parseFloat(params.seconds || 30);
        if (video) video.currentTime = Math.max(0, video.currentTime + sec);
        break;
      }
      case 'MEDIA_NEXT': {
        const nextBtn = document.querySelector('.ytp-next-button');
        if (nextBtn) nextBtn.click();
        break;
      }
      case 'MEDIA_PREV': {
        const prevBtn = document.querySelector('.ytp-prev-button');
        if (prevBtn) prevBtn.click();
        else window.history.back();
        break;
      }
      case 'SKIP_AD':
        neutralizeAds();
        break;
      case 'SET_RESOLUTION':
      case 'MEDIA_RESOLUTION': {
        const q = params.quality || params.resolution || 'auto';
        applyResolutionPreference(q);
        showHUDToast(`Remote Resolution: ${formatQualityLabel(q)}`);
        break;
      }
      case 'SET_SPEED':
      case 'MEDIA_SPEED': {
        const s = parseFloat(params.speed || 1.0);
        applyPlaybackSpeed(s);
        showHUDToast(`Speed: ${s}x`);
        break;
      }
      case 'SET_VOLUME_BOOST': {
        const boost = parseFloat(params.boost || 1.5);
        applyAudioGain(boost);
        showHUDToast(`Audio Boost: ${Math.round(boost * 100)}%`);
        break;
      }
      case 'PICTURE_IN_PICTURE':
      case 'TOGGLE_PIP':
        togglePictureInPicture();
        break;
      case 'CAPTURE_SCREENSHOT':
        captureVideoFrame();
        break;
      case 'GET_STATUS':
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'STATUS_RESPONSE',
            title: document.title,
            currentQuality: currentQuality,
            availableQualities: availableQualities,
            currentTime: video ? video.currentTime : 0,
            duration: video ? video.duration : 0,
            paused: video ? video.paused : true,
            playbackRate: video ? video.playbackRate : 1.0
          }));
        }
        break;
    }
  }

  connectJarvisBridge();

  // =========================================================
  // 8. EXTENSION RUNTIME MESSAGE HANDLER (For Extension Popup)
  // =========================================================
  if (browserAPI && browserAPI.runtime && browserAPI.runtime.onMessage) {
    browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const video = document.querySelector('video');

      if (request.action === 'GET_STATUS') {
        sendResponse({
          success: true,
          title: document.title,
          currentQuality: currentQuality,
          availableQualities: availableQualities,
          preferredResolution: config.preferredResolution,
          playbackRate: video ? video.playbackRate : 1.0,
          volumeBoost: config.volumeBoost,
          isAdPlaying: !!(document.querySelector('#movie_player.ad-showing')),
          wsConnected: !!(ws && ws.readyState === WebSocket.OPEN)
        });
        return true;
      }

      if (request.action === 'SET_RESOLUTION') {
        config.preferredResolution = request.quality;
        applyResolutionPreference(request.quality);
        showHUDToast(`Quality: ${formatQualityLabel(request.quality)}`);
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'SET_SPEED') {
        applyPlaybackSpeed(request.speed);
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'SET_VOLUME_BOOST') {
        config.volumeBoost = request.boost;
        applyAudioGain(request.boost);
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'TOGGLE_PIP') {
        togglePictureInPicture();
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'CAPTURE_SCREENSHOT') {
        captureVideoFrame();
        sendResponse({ success: true });
        return true;
      }
    });
  }

})();
