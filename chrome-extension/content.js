// =========================================================
// J.A.R.V.I.S. YOUTUBE SENTINEL & DIRECT MEDIA BRIDGE
// Autonomous 0.01ms Ad Annihilator & WebSocket Command Hub
// =========================================================

console.log('[JARVIS SENTINEL] Active on YouTube. Ad neutralization and media control armed.');

// 1. Ultra Fast Ad Neutralizer
function neutralizeAds() {
  try {
    const player = document.querySelector('#movie_player, .html5-video-player');
    const isAd = player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'));
    const adVideo = document.querySelector('video');

    // 1A. Click Verified Skip Buttons
    const skipSelectors = [
      '.ytp-ad-skip-button-modern',
      '.ytp-ad-skip-button',
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button-slot button',
      'button[id*="skip-button"]',
      '.videoAdUiSkipButton',
      '.ytp-ad-overlay-close-button'
    ];

    skipSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(btn => {
        try {
          if (btn && btn.offsetParent !== null) {
            btn.click();
            console.log('[JARVIS SENTINEL] Verified Skip Button Clicked!');
          }
        } catch (e) {}
      });
    });

    // 1B. Fast-forward Ad Stream Instantly
    if (isAd && adVideo) {
      adVideo.muted = true;
      if (!isNaN(adVideo.duration) && adVideo.duration > 0) {
        adVideo.currentTime = adVideo.duration + 2;
        adVideo.playbackRate = 16.0;
        console.log('[JARVIS SENTINEL] Unskippable Ad Fast-Forwarded to End.');
      }
    }

    // 1C. Dismiss Unwanted Popups & Overlays
    const popups = document.querySelectorAll('yt-confirm-dialog-renderer #confirm-button, ytd-popup-container #dismiss-button, tp-yt-paper-dialog #dismiss-button, .ytp-ad-overlay-close-button');
    popups.forEach(p => {
      try { p.click(); } catch(e) {}
    });

  } catch (err) {
    // Silent fail-safe
  }
}

// Run neutralization on every DOM mutation + 50ms interval
const observer = new MutationObserver(() => neutralizeAds());
observer.observe(document.documentElement, { childList: true, subtree: true });
setInterval(neutralizeAds, 50);

// 2. Direct WebSocket Media Bridge to Local J.A.R.V.I.S. Core
let ws = null;
function connectJarvisBridge() {
  try {
    const wsUrl = 'wss://127.0.0.1:3000/ws';
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[JARVIS SENTINEL] Connected to Stark Central Mainframe WebSocket.');
      ws.send(JSON.stringify({
        type: 'SENTINEL_HANDSHAKE',
        device: 'youtube_chrome_tab',
        title: document.title,
        url: window.location.href
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'COMMAND' && msg.payload) {
          const action = msg.payload.action;
          const params = msg.payload.params || {};
          const video = document.querySelector('video');

          if (action === 'MEDIA_PAUSE' && video) {
            video.pause();
          } else if ((action === 'MEDIA_RESUME' || action === 'MEDIA_PLAY') && video) {
            video.play();
          } else if (action === 'MEDIA_RESTART' && video) {
            video.currentTime = 0;
            video.play();
          } else if (action === 'MEDIA_SEEK' && video) {
            const sec = parseFloat(params.seconds || 30);
            video.currentTime = Math.max(0, video.currentTime + sec);
          } else if (action === 'MEDIA_NEXT') {
            const nextBtn = document.querySelector('.ytp-next-button');
            if (nextBtn) nextBtn.click();
          } else if (action === 'MEDIA_PREV') {
            const prevBtn = document.querySelector('.ytp-prev-button');
            if (prevBtn) prevBtn.click();
            else window.history.back();
          } else if (action === 'SKIP_AD') {
            neutralizeAds();
          }
        }
      } catch (e) {}
    };

    ws.onclose = () => {
      setTimeout(connectJarvisBridge, 3000);
    };

    ws.onerror = () => {
      if (ws) ws.close();
    };

  } catch (e) {
    setTimeout(connectJarvisBridge, 5000);
  }
}

connectJarvisBridge();
