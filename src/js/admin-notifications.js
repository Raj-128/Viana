import { createVisibleRefresh } from './visible-refresh.js';
export function initAdminNotifications({ api, root = document, refreshPanel }) {
  let snapshot, loading = false;
  const badges = new Map();
  root.querySelectorAll('[data-admin-tab]').forEach(tab => {
    const badge = document.createElement('span');
    badge.className = 'admin-new-count'; badge.hidden = true;
    badge.setAttribute('aria-live', 'polite');
    tab.append(badge); badges.set(tab.dataset.adminTab, badge);
  });
  function render() {
    for (const [category, badge] of badges) {
      const count = snapshot?.counts[category] || 0;
      badge.textContent = `${count} new`;
      badge.hidden = count === 0;
    }
  }
  async function refresh() {
    if (loading) return;
    loading = true;
    try { snapshot = await api('/api/admin/notifications'); render(); }
    catch { return false; /* Preserve unread markers when the connection is unavailable. */ }
    finally { loading = false; }
  }
  async function viewed(category) {
    // Acknowledge only the snapshot that existed before the panel refresh.
    const through = snapshot?.through;
    if (!through) return;
    try {
      if (await refreshPanel(category) === false) return;
      await api(`/api/admin/notifications?category=${category}&through=${through}`, {});
      await refresh();
    } catch { /* Failed loads must not mark notifications as read. */ }
  }
  const updates = createVisibleRefresh(refresh, { interval: 60000 });
  void updates.refresh();
  return { viewed, refresh: () => updates.refresh(true) };
}
