/** Anonymous play stats (no personal data): sent fire-and-forget to api/events.php. */
import { PORTAL } from './portal';
const URL_ = import.meta.env.BASE_URL + 'api/events.php';
export function track(e: 'start' | 'end' | 'task' | 'ach' | 'buy' | 'install', k = '', d = 0, z = 0) {
  if (PORTAL || location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
  const body = JSON.stringify({ e, k, d: Math.floor(d), z });
  try {
    if (navigator.sendBeacon?.(URL_, new Blob([body], { type: 'application/json' }))) return;
    fetch(URL_, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
  } catch { /* offline */ }
}
