// =========================================================
// AADI SENTINEL - EXTENSION POPUP CONTROLLER v2.1
// Cross-Browser Compatible: Apple Safari & Google Chrome
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const browserAPI = typeof chrome !== 'undefined' && chrome.runtime ? chrome : (typeof browser !== 'undefined' ? browser : null);

  // DOM Elements
  const wsStatusBadge = document.getElementById('wsStatusBadge');
  const wsStatusText = wsStatusBadge.querySelector('.status-text');
  const currentQualityBadge = document.getElementById('currentQualityBadge');
  const videoTitle = document.getElementById('videoTitle');
  const resSelect = document.getElementById('resSelect');
  const btnApplyRes = document.getElementById('btnApplyRes');

  const dlQualitySelect = document.getElementById('dlQualitySelect');
  const btnDownloadVideo = document.getElementById('btnDownloadVideo');
  const dlStatusHint = document.getElementById('dlStatusHint');

  const speedButtons = document.querySelectorAll('.speed-btn');
  const speedValueLabel = document.getElementById('speedValueLabel');
  const boostSlider = document.getElementById('boostSlider');
  const boostValueLabel = document.getElementById('boostValueLabel');
  const btnPip = document.getElementById('btnPip');
  const btnCapture = document.getElementById('btnCapture');

  const toggleAutoSkip = document.getElementById('toggleAutoSkip');
  const toggleAutoDismiss = document.getElementById('toggleAutoDismiss');
  const togglePlayerHUD = document.getElementById('togglePlayerHUD');
  const toggleAdBanners = document.getElementById('toggleAdBanners');

  let activeTabId = null;
  let activeTabUrl = '';

  // 1. Load Stored Preferences
  if (browserAPI && browserAPI.storage && browserAPI.storage.local) {
    browserAPI.storage.local.get({
      preferredResolution: 'auto',
      autoSkipAds: true,
      autoDismissDialogs: true,
      showPlayerHUD: true,
      hideAdBanners: true,
      volumeBoost: 1.0
    }, (items) => {
      if (items) {
        if (items.preferredResolution) resSelect.value = items.preferredResolution;
        toggleAutoSkip.checked = !!items.autoSkipAds;
        toggleAutoDismiss.checked = !!items.autoDismissDialogs;
        togglePlayerHUD.checked = !!items.showPlayerHUD;
        toggleAdBanners.checked = !!items.hideAdBanners;
        if (items.volumeBoost) {
          boostSlider.value = items.volumeBoost;
          boostValueLabel.textContent = `${Math.round(items.volumeBoost * 100)}%`;
        }
      }
    });
  }

  // 2. Query Active Tab and Communicate with Content Script
  function queryActiveTab() {
    if (!browserAPI || !browserAPI.tabs) return;

    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        activeTabId = tabs[0].id;
        activeTabUrl = tabs[0].url || '';

        if (activeTabUrl.includes('youtube.com')) {
          browserAPI.tabs.sendMessage(activeTabId, { action: 'GET_STATUS' }, (response) => {
            if (browserAPI.runtime.lastError || !response) {
              videoTitle.textContent = 'Active on YouTube (Ready)';
              return;
            }

            if (response.title) {
              videoTitle.textContent = response.title.replace(' - YouTube', '');
            }

            if (response.currentQuality) {
              currentQualityBadge.textContent = formatQualityBadge(response.currentQuality);
            }

            if (response.preferredResolution) {
              resSelect.value = response.preferredResolution;
            }

            if (response.playbackRate) {
              setSpeedButtonActive(response.playbackRate);
            }

            if (response.volumeBoost) {
              boostSlider.value = response.volumeBoost;
              boostValueLabel.textContent = `${Math.round(response.volumeBoost * 100)}%`;
            }

            // WebSocket Status Badge
            if (response.wsConnected) {
              wsStatusBadge.className = 'status-badge online';
              wsStatusText.textContent = 'AADI ONLINE';
            } else {
              wsStatusBadge.className = 'status-badge offline';
              wsStatusText.textContent = 'AADI STANDALONE';
            }
          });
        } else {
          videoTitle.textContent = 'Navigate to YouTube to activate controls';
          wsStatusText.textContent = 'AADI STANDALONE';
        }
      }
    });
  }

  function formatQualityBadge(q) {
    if (!q || q === 'unknown' || q === 'auto') return 'AUTO';
    const clean = q.toLowerCase();
    if (clean === 'highres' || clean === '4320p' || clean === '8k') return '8K';
    if (clean === 'hd2160' || clean === '4k' || clean === '2160p') return '4K';
    if (clean === 'hd1440' || clean === '1440p' || clean === '2k') return '1440p';
    if (clean === 'hd1080' || clean === '1080p') return '1080p';
    if (clean === 'hd720' || clean === '720p') return '720p';
    if (clean === 'large' || clean === '480p') return '480p';
    return q.toUpperCase();
  }

  function sendTabMessage(msg, callback) {
    if (!browserAPI || !browserAPI.tabs || !activeTabId) return;
    browserAPI.tabs.sendMessage(activeTabId, msg, (res) => {
      if (callback) callback(res);
    });
  }

  function saveConfig(key, val) {
    if (browserAPI && browserAPI.storage && browserAPI.storage.local) {
      browserAPI.storage.local.set({ [key]: val });
    }
  }

  // 3. UI Interactions

  // Download Video in Any Selected Resolution (Direct Mac Native Download via AADI Core)
  if (btnDownloadVideo) {
    btnDownloadVideo.addEventListener('click', () => {
      const q = dlQualitySelect ? dlQualitySelect.value : '1080p';
      btnDownloadVideo.textContent = '⏳ STARTING...';
      if (dlStatusHint) dlStatusHint.textContent = `Sending ${q} download task to AADI Core...`;

      fetch('http://127.0.0.1:3000/api/webhook/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DOWNLOAD_YOUTUBE',
          url: activeTabUrl,
          quality: q
        })
      })
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(data => {
        btnDownloadVideo.textContent = '✓ DOWNLOADING';
        if (dlStatusHint) dlStatusHint.textContent = `✓ Download started! Video saving to Mac ~/Downloads.`;
        setTimeout(() => {
          btnDownloadVideo.textContent = '⬇️ DOWNLOAD';
        }, 3000);
      })
      .catch(err => {
        console.warn('Local AADI server unreachable, using standalone fallback:', err);
        // Only if local Python server is NOT running at all
        const match = activeTabUrl.match(/[?&]v=([^&]+)/);
        if (match && match[1]) {
          window.open(`https://ssyoutube.com/watch?v=${match[1]}`, '_blank');
        } else {
          if (dlStatusHint) dlStatusHint.textContent = 'AADI server offline. Run ./start.sh';
        }
        btnDownloadVideo.textContent = '⬇️ DOWNLOAD';
      });
    });
  }

  // Apply Default Resolution
  btnApplyRes.addEventListener('click', () => {
    const quality = resSelect.value;
    saveConfig('preferredResolution', quality);
    currentQualityBadge.textContent = formatQualityBadge(quality);
    sendTabMessage({ action: 'SET_RESOLUTION', quality: quality });

    btnApplyRes.textContent = '✓ APPLIED';
    setTimeout(() => { btnApplyRes.textContent = 'APPLY'; }, 1200);
  });

  // Speed Buttons
  function setSpeedButtonActive(speed) {
    const s = parseFloat(speed);
    speedValueLabel.textContent = `${s}x`;
    speedButtons.forEach(btn => {
      const bSpeed = parseFloat(btn.getAttribute('data-speed'));
      btn.classList.toggle('active', Math.abs(bSpeed - s) < 0.05);
    });
  }

  speedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.getAttribute('data-speed'));
      setSpeedButtonActive(speed);
      sendTabMessage({ action: 'SET_SPEED', speed: speed });
    });
  });

  // Audio Boost Slider
  boostSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    const pct = Math.round(val * 100);
    boostValueLabel.textContent = `${pct}%`;
    saveConfig('volumeBoost', val);
    sendTabMessage({ action: 'SET_VOLUME_BOOST', boost: val });
  });

  // PiP Button
  btnPip.addEventListener('click', () => {
    sendTabMessage({ action: 'TOGGLE_PIP' });
  });

  // Screenshot Button
  btnCapture.addEventListener('click', () => {
    sendTabMessage({ action: 'CAPTURE_SCREENSHOT' });
  });

  // Defense Toggles
  toggleAutoSkip.addEventListener('change', (e) => {
    saveConfig('autoSkipAds', e.target.checked);
  });

  toggleAutoDismiss.addEventListener('change', (e) => {
    saveConfig('autoDismissDialogs', e.target.checked);
  });

  togglePlayerHUD.addEventListener('change', (e) => {
    saveConfig('showPlayerHUD', e.target.checked);
  });

  toggleAdBanners.addEventListener('change', (e) => {
    saveConfig('hideAdBanners', e.target.checked);
  });

  // Initialize
  queryActiveTab();
});
