// =========================================================
// AADI SENTINEL - EXTENSION BACKGROUND SERVICE WORKER v2.2
// Cross-Browser Support: Google Chrome & Apple Safari
// Manages Persistent WebSocket Bridge & Proxies Webhooks
// (Bypasses WebPage Frame Mixed-Content & CORS Restrictions)
// =========================================================

'use strict';

const browserAPI = typeof chrome !== 'undefined' && chrome.runtime ? chrome : (typeof browser !== 'undefined' ? browser : null);

const WS_URL = 'ws://127.0.0.1:3000/ws';
const API_BASE = 'http://127.0.0.1:3000';

let ws = null;
let isWsConnected = false;
let reconnectTimer = null;

// 1. PERSISTENT WEBSOCKET BRIDGE TO AADI CORE
function connectBridge() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[AADI BACKGROUND] Persistent WebSocket Bridge Connected to AADI Core');
      isWsConnected = true;
      try {
        ws.send(JSON.stringify({
          type: 'SENTINEL_HANDSHAKE',
          device: 'extension_background_worker',
          assistant: 'AADI',
          version: '2.2.0'
        }));
      } catch (e) {}
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'COMMAND' && msg.payload) {
          // Forward remote commands to all active YouTube tabs
          forwardCommandToYouTubeTabs(msg);
        }
      } catch (e) {}
    };

    ws.onclose = () => {
      isWsConnected = false;
      ws = null;
      scheduleReconnect();
    };

    ws.onerror = () => {
      isWsConnected = false;
      if (ws) {
        try { ws.close(); } catch(e) {}
        ws = null;
      }
      scheduleReconnect();
    };
  } catch (err) {
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connectBridge, 3000);
}

function forwardCommandToYouTubeTabs(msg) {
  if (!browserAPI || !browserAPI.tabs) return;

  browserAPI.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
    if (tabs && tabs.length > 0) {
      tabs.forEach((tab) => {
        try {
          browserAPI.tabs.sendMessage(tab.id, msg, () => {
            if (browserAPI.runtime.lastError) {}
          });
        } catch (e) {}
      });
    }
  });
}

// 2. RUNTIME MESSAGE LISTENER (Proxies HTTP & Provides Bridge Status)
if (browserAPI && browserAPI.runtime && browserAPI.runtime.onMessage) {
  browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // Bridge Connection Status Query
    if (request.action === 'GET_BRIDGE_STATUS') {
      sendResponse({
        success: true,
        wsConnected: isWsConnected,
        assistant: 'AADI'
      });
      return true;
    }

    // Proxy Webhook Trigger (Bypasses https frame / mixed-content restrictions)
    if (request.action === 'TRIGGER_WEBHOOK' || request.action === 'DOWNLOAD_VIDEO') {
      const targetAction = request.webhookAction || request.action || 'DOWNLOAD_YOUTUBE';
      const payload = {
        action: targetAction,
        url: request.url || (sender && sender.tab ? sender.tab.url : ''),
        quality: request.quality || '1080p'
      };

      fetch(`${API_BASE}/api/webhook/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(err => {
        console.warn('[AADI BACKGROUND] Webhook POST failed:', err);
        sendResponse({ success: false, error: err.message });
      });

      return true; // Asynchronous sendResponse
    }

    // Proxy Server Info Check
    if (request.action === 'CHECK_SERVER_STATUS') {
      fetch(`${API_BASE}/api/info`)
        .then(res => res.json())
        .then(data => sendResponse({ success: true, online: true, info: data }))
        .catch(err => sendResponse({ success: false, online: false, error: err.message }));
      return true;
    }

    // Forward WebSocket Messages from Content Script to Core Server
    if (request.action === 'WS_SEND') {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(request.payload || {}));
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
      } else {
        sendResponse({ success: false, error: 'Bridge disconnected' });
      }
      return true;
    }
  });
}

// Initial connection
connectBridge();
