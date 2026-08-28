/**
 * Tradis Core: Dual-Channel Cordis Live-Sync Receiver
 * Channel 1: Server-Sent Events (SSE) push
 * Channel 2: 600ms Micro-Heartbeat Version Polling fallback
 * Guarantees zero-refresh live updates across all browsers!
 */
export function initCordisLiveSync() {
  let currentVersion = null;

  function triggerReload() {
    console.log('[CORDIS LIVE SYNC] Triggering instant non-F5 live update...');
    window.location.reload();
  }

  // --- Channel 1: SSE Push ---
  if (window.EventSource) {
    try {
      const es = new EventSource('/_cordis_live');

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') {
            currentVersion = data.version;
          } else if (data.type === 'hot_reload') {
            triggerReload();
          }
        } catch (_) {}
      };

      es.addEventListener('hot_reload', () => {
        triggerReload();
      });
    } catch (_) {}
  }

  // --- Channel 2: 600ms Micro-Heartbeat Fallback ---
  setInterval(async () => {
    try {
      const res = await fetch(`/_cordis_version?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (currentVersion === null) {
          currentVersion = json.version;
        } else if (json.version !== currentVersion) {
          currentVersion = json.version;
          triggerReload();
        }
      }
    } catch (_) {}
  }, 600);
}