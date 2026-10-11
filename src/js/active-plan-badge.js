import { fetchApi } from './api-config.js';
import { createVisibleRefresh } from './visible-refresh.js';

export function planBadgeState(order, now = Date.now()) {
  if (!order || !['approved', 'expired'].includes(order.status)) return { label: 'Plans', detail: '', state: 'none' };
  const remaining = Number(order.expires_at) - now;
  if (!Number.isFinite(remaining)) return { label: 'Plans', detail: '', state: 'none' };
  if (remaining <= 0 || order.status === 'expired') return { label: 'Plan expired', detail: 'Renew plan', state: 'expired' };
  const days = Math.ceil(remaining / 86400000);
  return { label: order.plan?.name || 'Current plan', detail: days <= 7 ? (remaining < 86400000 ? 'Expires in under 1 day' : 'Expires in ' + days + ' days') : '', state: days <= 7 ? 'expiring' : 'active' };
}

export function initActivePlanBadge({ document: doc = document, window: win = window, request = fetchApi, hasSession = () => true } = {}) {
  let active, expiryTimer, freshRead = false;
  function render() {
    const state = planBadgeState(hasSession() ? active : null);
    for (const link of doc.querySelectorAll('.unlimited-download-link')) {
      link.textContent = state.label;
      link.setAttribute?.('data-plan-state', state.state);
      link.setAttribute?.('data-plan-expiry', state.detail);
      link.title = [state.label, state.detail].filter(Boolean).join(': ');
      link.setAttribute?.('aria-label', link.title + '. View download plans');
    }
    win.clearTimeout(expiryTimer);
    if (hasSession() && active?.expires_at > Date.now()) {
      expiryTimer = win.setTimeout(render, Math.min(86400000, active.expires_at - Date.now() + 1));
    }
  }

  const refresh = createVisibleRefresh(async () => {
    try {
      const fresh = freshRead; freshRead = false;
      const response = await request('api/plan-orders', { cache: fresh ? 'reload' : 'no-store' });
      if (!response.ok && response.status !== 401) return false;
      const data = response.ok ? await response.json() : null;
      const orders = Array.isArray(data?.orders) ? data.orders : [];
      active = orders.find(order => order.status === 'approved' && order.expires_at > Date.now())
        || orders.filter(order => ['approved', 'expired'].includes(order.status) && order.expires_at <= Date.now()).sort((a, b) => b.expires_at - a.expires_at)[0];
      win.clearTimeout(expiryTimer);
      render();
    } catch { return false; }
  }, { document: doc, window: win, interval: 300000, minInterval: 60000, enabled: hasSession });
  const reset = (fresh = false) => { active = null; freshRead = fresh; render(); void refresh.refresh(true); };
  win.addEventListener('storage', event => { if (!event.key || ['viana_token', 'viana-plan-orders-updated'].includes(event.key)) reset(true); });
  win.addEventListener('studio:auth-change', () => reset());
  render();
  void refresh.refresh();
  return { refresh: () => { freshRead = true; if (!hasSession()) { active = null; render(); } return refresh.refresh(true); } };
}
