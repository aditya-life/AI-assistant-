// =========================================================
// AADI YOUTUBE SENTINEL & DIRECT MEDIA BRIDGE v2.1
// Autonomous Ad Neutralizer, Auto-HD/4K Enforcer, Video Downloader
// Cross-Browser Compatible: Apple Safari & Google Chrome
// =========================================================

(function() {
  'use strict';

  console.log('[AADI SENTINEL v2.1] Active. Armed for ad neutralization, resolution mastery & video downloads.');

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

  // Settings Interaction Lock: Pauses all dismissal clicks when user touches settings
  let settingsMenuLocked = false;
  let unlockTimer = null;

  function lockSettingsInteraction() {
    settingsMenuLocked = true;
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(() => {
      settingsMenuLocked = false;
    }, 15000); // 15 seconds grace period
  }

  // Capture phase listener: Catch settings click BEFORE any DOM observer or interval
  document.addEventListener('click', (e) => {
    if (e.target && e.target.closest) {
      if (e.target.closest('.ytp-settings-button') ||
          e.target.closest('.ytp-settings-menu') ||
          e.target.closest('.ytp-popup.ytp-settings-menu') ||
          e.target.closest('.ytp-panel') ||
          e.target.closest('.ytp-quality-menu')) {
        lockSettingsInteraction();
      }
    }
  }, true);

  document.addEventListener('keydown', (e) => {
    if (settingsMenuLocked && (e.key === 'Escape' || e.key === 'Enter')) {
      setTimeout(() => { settingsMenuLocked = false; }, 400);
    }
  }, true);

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
      if (window.__AADI_SENTINEL_INJECTED__) return;
      const script = document.createElement('script');
      if (browserAPI && browserAPI.runtime && browserAPI.runtime.getURL) {
        script.src = browserAPI.runtime.getURL('inject.js');
      } else {
        script.src = 'inject.js';
      }
      script.onload = () => script.remove();
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      // Safe fallback
    }
  }

  injectMainWorldBridge();

  // Listen for Player Updates from inject.js
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.source !== 'AADI_SENTINEL_INJECT') return;

    if (event.data.type === 'QUALITY_UPDATE' && event.data.payload) {
      const { currentQuality: q, availableQualities: aq } = event.data.payload;
      if (q) currentQuality = q;
      if (Array.isArray(aq)) availableQualities = aq;
      updatePlayerHUDBadge();
    }
  });

  function applyResolutionPreference(quality) {
    window.postMessage({
      source: 'AADI_SENTINEL_CS',
      type: 'SET_RESOLUTION',
      payload: { quality: quality || config.preferredResolution }
    }, '*');
  }

  function applyPlaybackSpeed(speed) {
    window.postMessage({
      source: 'AADI_SENTINEL_CS',
      type: 'SET_PLAYBACK_SPEED',
      payload: { speed: speed }
    }, '*');
  }

  // =========================================================
  // 2. ULTRA-SAFE AD NEUTRALIZER (Zero Settings Interference)
  // =========================================================

  function isPlayerMenuOpen() {
    if (settingsMenuLocked) return true;

    // 1. YouTube native settings gear popup
    const settingsMenu = document.querySelector('.ytp-settings-menu, .ytp-popup.ytp-settings-menu');
    if (settingsMenu && settingsMenu.offsetParent !== null && getComputedStyle(settingsMenu).display !== 'none') {
      return true;
    }

    // 2. Settings button aria-expanded state
    const settingsBtn = document.querySelector('.ytp-settings-button');
    if (settingsBtn && (settingsBtn.getAttribute('aria-expanded') === 'true' || settingsBtn.classList.contains('ytp-button-active'))) {
      return true;
    }

    // 3. Submenus and quality panels
    const panels = document.querySelectorAll('.ytp-panel-menu, .ytp-quality-menu');
    for (const p of panels) {
      if (p.offsetParent !== null && getComputedStyle(p).display !== 'none') {
        return true;
      }
    }

    // 4. Video player popup animating
    const player = document.querySelector('#movie_player, .html5-video-player');
    if (player && (player.classList.contains('ytp-settings-menu-active') || player.classList.contains('ytp-popup-animating'))) {
      return true;
    }

    return false;
  }

  function neutralizeAds() {
    if (!config.autoSkipAds) return;

    // CRITICAL GUARD: Never touch anything if user is navigating settings!
    if (isPlayerMenuOpen()) {
      return;
    }

    try {
      const player = document.querySelector('#movie_player, .html5-video-player');
      const isAd = player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'));
      const adVideo = document.querySelector('video');

      // 2A. Verified Ad Skip Buttons - ONLY when ad is actively showing!
      if (isAd) {
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
              console.log('[AADI SENTINEL] Verified Skip Button Clicked!');
            }
          }
        }

        // 2B. Fast-forward Video Ad Stream Instantly
        if (adVideo) {
          if (!wasMutedBySentinel) {
            previousPlaybackRate = adVideo.playbackRate || 1.0;
            wasMutedBySentinel = true;
          }
          adVideo.muted = true;
          if (!isNaN(adVideo.duration) && adVideo.duration > 0) {
            adVideo.currentTime = adVideo.duration + 2;
            adVideo.playbackRate = 16.0;
          }
        }
      } else if (!isAd && wasMutedBySentinel && adVideo) {
        // Restore audio & speed once ad finishes
        wasMutedBySentinel = false;
        adVideo.muted = false;
        adVideo.playbackRate = previousPlaybackRate || 1.0;
      }

      // 2C. SAFE Dialog & Overlay Dismissal - Only when settings menu is completely closed
      if (config.autoDismissDialogs) {
        // Handle "Video paused. Continue watching?" prompt safely
        const confirmDialog = document.querySelector('yt-confirm-dialog-renderer');
        if (confirmDialog && confirmDialog.offsetParent !== null && getComputedStyle(confirmDialog).display !== 'none') {
          const text = (confirmDialog.textContent || '').toLowerCase();
          if (text.includes('watching') || text.includes('paused') || text.includes('continue')) {
            const confirmBtn = confirmDialog.querySelector('#confirm-button button, #confirm-button');
            if (confirmBtn && confirmBtn.offsetParent !== null) {
              confirmBtn.click();
              console.log('[AADI SENTINEL] Auto-resumed "Continue watching" prompt.');
            }
          }
        }

        // Handle YouTube Anti-Adblock modal cleanly without closing normal menus
        const enforcementModal = document.querySelector('ytd-enforcement-message-view-model');
        if (enforcementModal && enforcementModal.offsetParent !== null && getComputedStyle(enforcementModal).display !== 'none') {
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
    // Skip mutations inside settings menu or Aadi HUD to prevent loop
    for (let i = 0; i < mutations.length; i++) {
      const target = mutations[i].target;
      if (target && target.closest && (
          target.closest('.ytp-settings-menu') ||
          target.closest('.ytp-popup.ytp-settings-menu') ||
          target.closest('.ytp-panel') ||
          target.closest('.aadi-res-menu') ||
          target.closest('.aadi-res-btn')
      )) {
        return;
      }
    }
    scheduleNeutralization();
  });

  function startObserver() {
    const target = document.getElementById('movie_player') || document.body || document.documentElement;
    if (target) {
      observer.observe(target, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }

  // Low-frequency safety poll (checking only when ad is present)
  setInterval(() => {
    const player = document.querySelector('#movie_player, .html5-video-player');
    if (player && (player.classList.contains('ad-showing') || document.querySelector('.ytp-ad-skip-button-modern, .ytp-ad-skip-button'))) {
      neutralizeAds();
    }
  }, 400);

  // =========================================================
  // 3. A.A.D.I. ON-PLAYER RESOLUTION HUD (Zero NotFoundError)
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
    }, 2400);
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

  // Safe Insertion Helper: NEVER throws NotFoundError in Safari
  function safelyInsertHUDButton(rightControls, button) {
    try {
      const settingsBtn = rightControls.querySelector('.ytp-settings-button');
      if (settingsBtn) {
        if (settingsBtn.parentNode === rightControls) {
          rightControls.insertBefore(button, settingsBtn);
          return;
        }

        let current = settingsBtn;
        while (current.parentNode && current.parentNode !== rightControls && current.parentNode !== document.body) {
          current = current.parentNode;
        }

        if (current.parentNode === rightControls) {
          rightControls.insertBefore(button, current);
          return;
        }

        if (settingsBtn.parentNode) {
          settingsBtn.parentNode.insertBefore(button, settingsBtn);
          return;
        }
      }

      rightControls.appendChild(button);
    } catch (err) {
      console.warn('[AADI SENTINEL] Safe insert fallback:', err);
      try {
        rightControls.appendChild(button);
      } catch (e) {}
    }
  }

  function injectPlayerHUD() {
    if (!config.showPlayerHUD) return;
    if (document.querySelector('.jarvis-res-btn')) return;

    const rightControls = document.querySelector('.ytp-right-controls');
    const player = document.querySelector('#movie_player, .html5-video-player');
    if (!rightControls || !player) return;

    // Create Button
    if (!hudButton) {
      hudButton = document.createElement('button');
      hudButton.className = 'ytp-button jarvis-res-btn aadi-res-btn';
      hudButton.setAttribute('title', 'AADI Quality Sentinel');
      hudButton.setAttribute('aria-label', 'AADI Resolution Switcher');
      hudButton.setAttribute('type', 'button');
      hudButton.innerHTML = `
        <div class="jarvis-res-pill">
          <span class="jarvis-res-icon">⚡</span>
          <span class="jarvis-res-text">${formatQualityLabel(currentQuality)}</span>
          <span class="jarvis-res-caret">▼</span>
        </div>
      `;

      // Toggle menu on click
      hudButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (hudMenu) {
          hudMenu.classList.toggle('open');
        }
      });
    }

    // Create Menu
    if (!hudMenu) {
      hudMenu = document.createElement('div');
      hudMenu.className = 'jarvis-res-menu aadi-res-menu';
      hudMenu.innerHTML = `
        <div class="jarvis-menu-header">
          <span>AADI RESOLUTION</span>
        </div>
        <button type="button" class="jarvis-menu-item" data-quality="auto">Auto (Default)</button>
        <button type="button" class="jarvis-menu-item" data-quality="4320p">8K Ultra HD</button>
        <button type="button" class="jarvis-menu-item" data-quality="2160p">4K UHD (2160p)</button>
        <button type="button" class="jarvis-menu-item" data-quality="1440p">2K QHD (1440p)</button>
        <button type="button" class="jarvis-menu-item" data-quality="1080p">1080p Full HD</button>
        <button type="button" class="jarvis-menu-item" data-quality="720p">720p HD</button>
        <button type="button" class="jarvis-menu-item" data-quality="480p">480p SD</button>
        <div class="jarvis-menu-header" style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(0,229,255,0.2);">
          <span>DOWNLOAD MEDIA</span>
        </div>
        <button type="button" class="jarvis-menu-item jarvis-dl-item" data-action="download-current">⬇️ Download Video (HD)</button>
        <button type="button" class="jarvis-menu-item jarvis-dl-item" data-action="download-audio">🎵 Download MP3 Audio</button>
      `;

      // Handle Option Click
      hudMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const dlItem = e.target.closest('.jarvis-dl-item');
        if (dlItem) {
          const dlAction = dlItem.getAttribute('data-action');
          const dlQuality = (dlAction === 'download-audio') ? 'mp3' : (currentQuality || '1080p');
          triggerVideoDownload(dlQuality);
          hudMenu.classList.remove('open');
          return;
        }

        const item = e.target.closest('.jarvis-menu-item');
        if (!item) return;

        const targetQuality = item.getAttribute('data-quality');
        if (targetQuality) {
          config.preferredResolution = targetQuality;
          if (browserAPI && browserAPI.storage && browserAPI.storage.local) {
            browserAPI.storage.local.set({ preferredResolution: targetQuality });
          }
          applyResolutionPreference(targetQuality);
          showHUDToast(`AADI: Resolution set to ${formatQualityLabel(targetQuality)}`);
          hudMenu.classList.remove('open');
          updatePlayerHUDBadge();
        }
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (hudMenu && !hudMenu.contains(e.target) && !hudButton.contains(e.target)) {
          hudMenu.classList.remove('open');
        }
      });
    }

    // Safe Insertion of Button into rightControls
    safelyInsertHUDButton(rightControls, hudButton);

    // Safe Insertion of Menu into player container
    try {
      if (hudMenu && !hudMenu.parentNode) {
        player.appendChild(hudMenu);
      }
    } catch (err) {
      try {
        document.body.appendChild(hudMenu);
      } catch (e) {}
    }

    updatePlayerHUDBadge();
  }

  function updateHUDVisibility() {
    if (hudButton) hudButton.style.display = config.showPlayerHUD ? 'inline-flex' : 'none';
    if (hudMenu && !config.showPlayerHUD) hudMenu.classList.remove('open');
    if (config.showPlayerHUD && !hudButton) injectPlayerHUD();
  }

  setInterval(injectPlayerHUD, 1500);

  // =========================================================
  // 4. SMART VIDEO DOWNLOADER (AADI Native yt-dlp + Standalone Fallback)
  // =========================================================
  function triggerVideoDownload(quality) {
    const videoUrl = window.location.href;
    const targetQ = quality || '1080p';

    showHUDToast(`AADI: Initiating ${targetQ.toUpperCase()} Download...`);

    // If connected to AADI Core WebSocket, trigger background yt-dlp to ~/Downloads
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'COMMAND',
        payload: {
          action: 'DOWNLOAD_YOUTUBE',
          params: {
            url: videoUrl,
            quality: targetQ
          }
        }
      }));
      console.log(`[AADI SENTINEL] Dispatched native yt-dlp download: ${targetQ}`);
      setTimeout(() => {
        showHUDToast(`✓ Download started to Mac ~/Downloads!`);
      }, 1000);
      return true;
    }

    // STANDALONE MODE FALLBACK (When local Python server is not running)
    const match = videoUrl.match(/[?&]v=([^&]+)/);
    const videoId = match ? match[1] : '';

    if (videoId) {
      // 100% verified active download portal (SaveFrom / SSYouTube)
      const fallbackUrl = `https://ssyoutube.com/watch?v=${videoId}`;
      window.open(fallbackUrl, '_blank');
      showHUDToast(`AADI Standalone: Opened Download Portal!`);
    } else {
      showHUDToast(`AADI: Please open a YouTube video to download.`);
    }
    return false;
  }

  // =========================================================
  // 5. WEB AUDIO BOOSTER (Up to 300% Gain)
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
        console.log(`[AADI SENTINEL] Audio gain set to ${Math.round(mult * 100)}%`);
      }
    } catch (e) {
      // AudioContext safe error
    }
  }

  // =========================================================
  // 6. HIGH-DEF FRAME CAPTURE (Screenshot)
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
      const filename = `AADI_${title}_${Date.now()}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();

      showHUDToast('HD Frame Captured!');
    } catch (e) {
      console.warn('[AADI SENTINEL] Frame capture error:', e);
    }
  }

  // =========================================================
  // 7. PICTURE-IN-PICTURE (PiP)
  // =========================================================
  function togglePictureInPicture() {
    const video = document.querySelector('video');
    if (!video) return;

    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (video.requestPictureInPicture) {
      video.requestPictureInPicture().catch(() => {});
    } else if (video.webkitSetPresentationMode) {
      video.webkitSetPresentationMode(video.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture');
    }
  }

  // =========================================================
  // 8. DIRECT WEBSOCKET MEDIA BRIDGE TO LOCAL A.A.D.I. CORE
  // =========================================================
  let ws = null;
  let wsRetryDelay = 2000;

  function connectAadiBridge() {
    try {
      const targetUrl = config.wsUrl || 'wss://127.0.0.1:3000/ws';
      ws = new WebSocket(targetUrl);

      ws.onopen = () => {
        console.log('[AADI SENTINEL] Connected to AADI Core WebSocket.');
        wsRetryDelay = 2000;
        ws.send(JSON.stringify({
          type: 'SENTINEL_HANDSHAKE',
          device: 'youtube_sentinel_tab',
          assistant: 'AADI',
          version: '2.1.0',
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
        if (config.wsUrl && config.wsUrl.startsWith('wss://127.0.0.1') && wsRetryDelay > 4000) {
          config.wsUrl = 'ws://127.0.0.1:3000/ws';
        }
        wsRetryDelay = Math.min(10000, wsRetryDelay * 1.5);
        setTimeout(connectAadiBridge, wsRetryDelay);
      };

      ws.onerror = () => {
        if (ws) ws.close();
      };

    } catch (e) {
      setTimeout(connectAadiBridge, 5000);
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
        showHUDToast(`AADI: ${formatQualityLabel(q)} Applied`);
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
      case 'DOWNLOAD_YOUTUBE':
      case 'DOWNLOAD_VIDEO':
        triggerVideoDownload(params.quality || '1080p');
        break;
      case 'GET_STATUS':
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'STATUS_RESPONSE',
            assistant: 'AADI',
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

  connectAadiBridge();

  // =========================================================
  // 9. EXTENSION RUNTIME MESSAGE HANDLER (For Extension Popup)
  // =========================================================
  if (browserAPI && browserAPI.runtime && browserAPI.runtime.onMessage) {
    browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const video = document.querySelector('video');

      if (request.action === 'GET_STATUS') {
        sendResponse({
          success: true,
          assistant: 'AADI',
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
        showHUDToast(`AADI: ${formatQualityLabel(request.quality)}`);
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'DOWNLOAD_VIDEO') {
        const success = triggerVideoDownload(request.quality || '1080p');
        sendResponse({ success: true, native: success });
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
