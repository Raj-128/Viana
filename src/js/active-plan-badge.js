import { fetchApi } from './api-config.js';
import { createVisibleRefresh } from './visible-refresh.js';

export function initActivePlanBadge({ document: doc = document, window: win = window, request = fetchApi, hasSession = () => true } = {}) {
  let active, expiryTimer, freshRead = false;
  function render() {
    const valid = hasSession() && active?.expires_at > Date.now() && active.status === 'approved';
    for (const link of doc.querySelectorAll('.unlimited-download-link')) {
      link.textContent = valid ? active.plan.name : 'Plans';
      link.title = valid ? `${active.plan.name}: active until ${new Date(active.expires_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` : 'Compare download plans';
      link.setAttribute?.('aria-label', link.title);
    }
  }
  const refresh = createVisibleRefresh(async () => {
    try {
      const fresh = freshRead; freshRead = false;
      const response = await request('api/plan-orders', { cache: fresh ? 'reload' : 'no-store' });
      if (!response.ok && response.status !== 401) return false;
      const data = response.ok ? await response.json() : null;
      active = data?.orders.find(order => order.status === 'approved' && order.expires_at > Date.now());
      win.clearTimeout(expiryTimer);
      render();
      // Expiry changes the label locally. It does not need a network round trip.
      if (active) expiryTimer = win.setTimeout(render, Math.min(2147483647, active.expires_at - Date.now() + 1));
    } catch { return false; }
  }, { document: doc, window: win, interval: 300000, minInterval: 60000, enabled: hasSession });
  const reset = (fresh = false) => { active = null; freshRead = fresh; render(); void refresh.refresh(true); };
  win.addEventListener('storage', event => { if (!event.key || ['viana_token', 'viana-plan-orders-updated'].includes(event.key)) reset(true); });
  win.addEventListener('studio:auth-change', () => reset());
  render();
  void refresh.refresh();
  return { refresh: () => { freshRead = true; if (!hasSession()) { active = null; render(); } return refresh.refresh(true); } };
}
