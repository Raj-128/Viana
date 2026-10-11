import { createPlanOrderSummary } from './admin-plan-summary.js';
import { downloadPlans, planLimitLabel } from './download-plans.js';

export function initPlanOrders({ api, status }) {
  const host = document.getElementById('plan-orders');
  let busy = false;
  async function refresh() {
    const { orders } = await api('/api/admin/plan-orders');
    host.replaceChildren();
    if (!orders.length) host.textContent = 'No plan requests yet.';
    for (const order of orders) {
      const row = createPlanOrderSummary(order);
      const actions = document.createElement('div'); actions.className = 'approval-row-actions admin-plan-actions';
      const decisions = order.status === 'pending' ? [['Confirm paid & approve', 'approve'], ['Reject', 'reject']] : order.status === 'approved' ? [['Revoke downloads', 'revoke']] : [];
      for (const [label, action] of decisions) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
        if (action !== 'approve') button.className = 'approval-danger';
        button.addEventListener('click', async () => {
          if (busy) return;
          busy = true; host.querySelectorAll('button').forEach(button => { button.disabled = true; });
          try {
            await api(`/api/admin/plan-orders/${order.id}`, { action });
            try { localStorage.setItem('viana-plan-orders-updated', `${Date.now()}:${order.id}:${action}`); } catch { /* Other browsers refresh from the server automatically. */ }
            await refresh();
            status.textContent = action === 'approve' ? 'Payment confirmed. Customer plan is marked Purchased and is now active.' : 'Plan access updated.';
          }
          catch (error) { status.textContent = error.message; }
          finally { busy = false; host.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
        });
        actions.append(button);
      }
      row.append(actions); host.append(row);
    }
  }
  document.getElementById('refresh-plan-orders').addEventListener('click', () => refresh().catch(error => { status.textContent = error.message; }));
  const form = document.getElementById('free-plan-form');
  const select = document.getElementById('free-plan-select');
  if (form && select) {
    downloadPlans.forEach(plan => {
      const option = document.createElement('option'); option.value = plan.id;
      option.textContent = `${plan.name} · ${plan.days} days · ${planLimitLabel(plan)}`; select.append(option);
    });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return;
      busy = true; const submit = form.querySelector('button'); submit.disabled = true;
      const message = document.getElementById('free-plan-status');
      const email = document.getElementById('free-plan-email').value.trim();
      message.textContent = 'Activating free plan…';
      try {
        const { order } = await api('/api/admin/plan-orders/grant', { email, planId: select.value });
        message.textContent = `${order.plan.name} activated free for ${email}. Expires ${new Date(order.expires_at).toLocaleDateString('en-IN')}.`;
        try { localStorage.setItem('viana-plan-orders-updated', `${Date.now()}:${order.id}:grant`); } catch { /* Customer pages also poll. */ }
        await refresh();
      } catch (error) { message.textContent = error.message; }
      finally { busy = false; submit.disabled = false; }
    });
  }
  return { refresh };
}
