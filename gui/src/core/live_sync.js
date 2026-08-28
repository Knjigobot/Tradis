/**
 * Tradis Core: Cordis Live-Sync Receiver
 * Listens for hot updates over Server-Sent Events (SSE) and applies updates live
 * without requiring the user to press refresh!
 */
export function initCordisLiveSync(onUpdateCallback) {
  if (!window.EventSource) return;

  const es = new EventSource('/_cordis_live');

  es.onopen = () => {
    console.log('[CORDIS LIVE SYNC] Connected to hot-update event stream.');
  };

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'hot_reload') {
        console.log(`[CORDIS LIVE SYNC] Received live update for ${data.file}. Applying instantly...`);
        if (onUpdateCallback) {
          onUpdateCallback(data.file);
        } else {
          // Automatic seamless live reload
          window.location.reload();
        }
      }
    } catch (err) {
      console.warn('[CORDIS LIVE SYNC] Message parse error:', err);
    }
  };

  es.onerror = () => {
    // Reconnect automatically handled by EventSource
  };
}