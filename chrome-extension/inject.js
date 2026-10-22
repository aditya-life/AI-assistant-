// =========================================================
// AADI SENTINEL - MAIN WORLD YOUTUBE INJECTOR v2.1
// Direct YouTube HTML5 Player API Bridge for 4K/HD Quality
// =========================================================

(function() {
  'use strict';

  if (window.__AADI_SENTINEL_INJECTED__) return;
  window.__AADI_SENTINEL_INJECTED__ = true;

  console.log('[AADI INJECT] Main World Player Bridge Initialized.');

  const QUALITY_MAP = {
    '8k': 'highres',
    '4320p': 'highres',
    'highres': 'highres',
    '4k': 'hd2160',
    '2160p': 'hd2160',
    'hd2160': 'hd2160',
    '1440p': 'hd1440',
    '2k': 'hd1440',
    'hd1440': 'hd1440',
    '1080p': 'hd1080',
    'fhd': 'hd1080',
    'hd1080': 'hd1080',
    '720p': 'hd720',
    'hd': 'hd720',
    'hd720': 'hd720',
    '480p': 'large',
    'large': 'large',
    '360p': 'medium',
    'medium': 'medium',
    '240p': 'small',
    'small': 'small',
    '144p': 'tiny',
    'tiny': 'tiny',
    'auto': 'auto',
    'max': 'max'
  };

  const QUALITY_ORDER = [
    'highres',
    'hd2880',
    'hd2160',
    'hd1440',
    'hd1080',
    'hd720',
    'large',
    'medium',
    'small',
    'tiny'
  ];

  let preferredQuality = 'auto';

  function getPlayer() {
    return document.getElementById('movie_player') || document.querySelector('.html5-video-player');
  }

  function getAvailableQualities() {
    const player = getPlayer();
    if (!player) return [];
    if (typeof player.getAvailableQualityLevels === 'function') {
      return player.getAvailableQualityLevels();
    }
    return [];
  }

  function getCurrentQuality() {
    const player = getPlayer();
    if (!player) return 'unknown';
    if (typeof player.getPlaybackQuality === 'function') {
      return player.getPlaybackQuality();
    }
    return 'unknown';
  }

  function resolveQuality(target, available) {
    if (!target || target === 'auto') return 'auto';

    let mapped = QUALITY_MAP[target.toLowerCase()] || target;

    if (mapped === 'max') {
      const topQuality = available.find(q => q !== 'auto');
      return topQuality || 'hd1080';
    }

    if (!available || available.length === 0) {
      return mapped;
    }

    if (available.includes(mapped)) {
      return mapped;
    }

    // Fallback: Find closest available quality without downgrading too far
    const reqIndex = QUALITY_ORDER.indexOf(mapped);
    if (reqIndex !== -1) {
      for (let i = reqIndex; i < QUALITY_ORDER.length; i++) {
        if (available.includes(QUALITY_ORDER[i])) {
          return QUALITY_ORDER[i];
        }
      }
      for (let i = reqIndex - 1; i >= 0; i--) {
        if (available.includes(QUALITY_ORDER[i])) {
          return QUALITY_ORDER[i];
        }
      }
    }

    return available[0] || mapped;
  }

  function applyQuality(target, attempts = 0) {
    const player = getPlayer();
    if (!player) {
      if (attempts < 8) {
        setTimeout(() => applyQuality(target, attempts + 1), 300);
      }
      return;
    }

    const available = getAvailableQualities();
    const finalQuality = resolveQuality(target, available);

    try {
      if (typeof player.setPlaybackQualityRange === 'function') {
        player.setPlaybackQualityRange(finalQuality, finalQuality);
      }
      if (typeof player.setPlaybackQuality === 'function') {
        player.setPlaybackQuality(finalQuality);
      }

      console.log(`[AADI INJECT] Target: "${target}" -> Enforced: "${finalQuality}" (Current: ${getCurrentQuality()})`);

      // Post update back to content script
      sendQualityUpdate();
    } catch (e) {
      console.warn('[AADI INJECT] Quality application error:', e);
    }

    if (attempts === 0 && finalQuality !== 'auto') {
      setTimeout(() => applyQuality(target, 1), 1000);
      setTimeout(() => applyQuality(target, 2), 2500);
    }
  }

  function sendQualityUpdate() {
    const player = getPlayer();
    window.postMessage({
      source: 'AADI_SENTINEL_INJECT',
      type: 'QUALITY_UPDATE',
      payload: {
        currentQuality: getCurrentQuality(),
        availableQualities: getAvailableQualities(),
        preferredQuality: preferredQuality,
        videoData: (player && typeof player.getVideoData === 'function') ? player.getVideoData() : null,
        playbackRate: (player && typeof player.getPlaybackRate === 'function') ? player.getPlaybackRate() : 1
      }
    }, '*');
  }

  // Listen for commands from content.js
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.source !== 'AADI_SENTINEL_CS') return;

    const { type, payload } = event.data;

    switch (type) {
      case 'SET_RESOLUTION': {
        const quality = payload && payload.quality ? payload.quality : 'auto';
        preferredQuality = quality;
        applyQuality(quality);
        break;
      }
      case 'SET_PLAYBACK_SPEED': {
        const speed = parseFloat(payload && payload.speed);
        const player = getPlayer();
        if (player && !isNaN(speed) && typeof player.setPlaybackRate === 'function') {
          player.setPlaybackRate(speed);
        }
        sendQualityUpdate();
        break;
      }
      case 'GET_STATUS': {
        sendQualityUpdate();
        break;
      }
    }
  });

  // Auto-enforce on navigation and player events
  function onVideoNavigate() {
    if (preferredQuality && preferredQuality !== 'auto') {
      setTimeout(() => applyQuality(preferredQuality), 600);
    }
    setTimeout(sendQualityUpdate, 1000);
  }

  window.addEventListener('yt-navigate-finish', onVideoNavigate);
  window.addEventListener('yt-page-data-updated', onVideoNavigate);

  // Hook into video element events
  function attachVideoListeners() {
    const video = document.querySelector('video');
    if (video && !video.__aadi_hooked__) {
      video.__aadi_hooked__ = true;
      video.addEventListener('loadedmetadata', () => {
        if (preferredQuality && preferredQuality !== 'auto') {
          setTimeout(() => applyQuality(preferredQuality), 400);
        }
      });
      video.addEventListener('playing', () => {
        sendQualityUpdate();
      });
    }
  }

  attachVideoListeners();
  setInterval(attachVideoListeners, 2000);

  // Initial announcement
  setTimeout(sendQualityUpdate, 1200);
})();
