import { createVisibleRefresh } from './visible-refresh.js';
import { fetchApi } from './api-config.js';
import { downloadPlans, downloadFormats, planLimitLabel } from './download-plans.js';
import { renderRecentDownloads } from './recent-plan-downloads.js';

const status = document.getElementById('plan-order-status');
const history = document.getElementById('plan-order-history');
const login = document.getElementById('plan-order-login');
const buttons = [...document.querySelectorAll('[data-order-plan]')];
for (const button of buttons) {
  const plan = downloadPlans.find(item => item.id === button.dataset.orderPlan);
  button.closest('.plan-card').querySelector('.price-circle strong').textContent = `₹${plan.price.toLocaleString('en-IN')}`;
  const features = button.closest('.plan-card').querySelector('.plan-features');
  features.querySelector('dd').textContent = planLimitLabel(plan);
  const group = document.createElement('div');
  group.className = 'plan-format-limits';
  const title = document.createElement('dt'); title.textContent = 'Daily format limits';
  const detail = document.createElement('dd');
  const list = document.createElement('ul');
  for (const format of downloadFormats) {
    const row = document.createElement('li');
    const label = document.createElement('span'); label.textContent = format.label;
    const count = document.createElement('strong'); count.textContent = `${plan.formatLimits[format.id]} / day`; count.dataset.formatLimit = format.id;
    row.append(label, count); list.append(row);
  }
  detail.append(list); group.append(title, detail); features.firstElementChild.after(group);
}
let busy = false, orders = [], signedIn = false, refreshVersion = 0, usedToday = 0, formatUsageToday = {};
async function request(path, body, fresh = false) {
  const response = await fetchApi(path, { method: body ? 'POST' : 'GET', cache: fresh ? 'reload' : 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Could not connect. Please try again.'), { status: response.status });
  return data;
}
function controls() {
  const pending = orders.find(order => order.status === 'pending');
  for (const button of buttons) {
    const purchased = orders.find(order => order.plan.id === button.dataset.orderPlan && order.approved_at != null);
    const active = purchased?.status === 'approved' && purchased.expires_at > Date.now();
    const plan = active ? purchased.plan : downloadPlans.find(plan => plan.id === button.dataset.orderPlan);
    const features = button.closest('.plan-card').querySelector('.plan-features');
    const allowance = plan.totalLimit ?? plan.dailyLimit;
    const used = plan.totalLimit ? purchased?.usedTotal || 0 : usedToday;
    features.querySelector('dd').textContent = active ? `${Math.max(0, allowance - used)} / ${allowance} files left ${plan.totalLimit ? 'this plan' : 'today'}` : planLimitLabel(plan);
    for (const format of downloadFormats) {
      const count = features.querySelector(`[data-format-limit="${format.id}"]`);
      const limit = plan.formatLimits?.[format.id];
      count.textContent = active && limit != null ? `${Math.max(0, limit - (formatUsageToday[format.id] || 0))} / ${limit} left today` : limit != null ? `${limit} / day` : 'Not specified';
      count.title = active && limit != null ? `${formatUsageToday[format.id] || 0} downloaded today. Resets at midnight India time.` : '';
    }
    const ownPending = pending?.plan.id === button.dataset.orderPlan;
    button.disabled = busy || active || Boolean(pending && !ownPending);
    button.textContent = active ? purchased.paymentStatus === 'complimentary' ? 'Active · Free plan' : 'Purchased' : ownPending ? 'Open WhatsApp · Pending' : purchased ? 'Renew plan' : 'Order now';
    button.dataset.purchased = active ? 'true' : 'false';
    let badge = button.closest('.plan-card').querySelector('.plan-purchase-status');
    if (!badge) {
      badge = document.createElement('p'); badge.className = 'plan-purchase-status';
      button.before(badge);
    }
    badge.hidden = !purchased;
    badge.textContent = purchased ? `${purchased.paymentStatus === 'complimentary' ? 'Complimentary · Studio granted' : 'Paid · Purchased'}${active ? '' : purchased.expires_at <= Date.now() ? ' · Expired' : ` · ${purchased.status}`}` : '';
  }
}
async function refresh(fresh = false) {
  const version = ++refreshVersion;
  let success = true;
  try {
    const data = await request('api/plan-orders', undefined, fresh);
    if (version !== refreshVersion) return;
    signedIn = true; login.hidden = true; orders = data.orders;
    usedToday = data.usedToday || 0; formatUsageToday = data.formatUsageToday || {};
    void renderRecentDownloads(data.recentDownloads || []);
    const active = orders.find(order => order.status === 'approved' && order.expires_at > Date.now());
    if (active) status.textContent = active.paymentStatus === 'complimentary' ? `${active.plan.name} activated free by the studio. Your plan is active.` : `${active.plan.name} purchased. Payment confirmed by the studio. Your plan is active.`;
    history.replaceChildren();
    const account = document.createElement('p'); account.textContent = `Requests are sent with your account email: ${data.email}`; history.append(account);
    for (const order of orders) {
      const row = document.createElement('p');
      row.textContent = `${order.plan.name} · ₹${order.plan.price.toLocaleString('en-IN')} · ${order.status}`;
      row.textContent += ` | Request ID: ${order.reference || order.id}`;
      if (order.paymentStatus === 'paid') row.textContent += ` · Paid · Purchased on ${new Date(order.approved_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
      if (order.paymentStatus === 'complimentary') row.textContent += ' · Complimentary · Granted free by the studio';
      if (order.status === 'approved') row.textContent += ` · Expires ${new Date(order.expires_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} · ${order.plan.totalLimit ? `${order.usedTotal}/${order.plan.totalLimit} files used this plan` : `${data.usedToday}/${order.plan.dailyLimit} downloads today`}`;
      if (order.status === 'pending' && order.whatsappUrl) {
        const link = document.createElement('a');
        link.href = order.whatsappUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.textContent = 'Open WhatsApp with plan details'; link.className = 'plan-whatsapp-link'; row.append(link);
      }
      history.append(row);
    }
  } catch (error) {
    if (version !== refreshVersion) return;
    success = false;
    if (error.status === 401) { signedIn = false; orders = []; history.replaceChildren(); void renderRecentDownloads([], { signedIn: false }); login.hidden = false; status.textContent = 'Sign in with your email to send a plan request.'; }
    else status.textContent = error.message;
  }
  controls();
  return success;
}
for (const button of buttons) button.addEventListener('click', async () => {
  if (busy) return;
  if (!signedIn) { login.hidden = false; status.textContent = 'Please sign in first, then return here and select your plan.'; login.focus(); return; }
  // Reserve a tab during the click so the async save does not trigger popup blocking.
  const whatsappTab = window.open('about:blank', '_blank');
  if (whatsappTab) whatsappTab.opener = null;
  busy = true; controls(); status.textContent = 'Sending your request to the studio…';
  try {
    const plan = downloadPlans.find(plan => plan.id === button.dataset.orderPlan);
    const { order } = await request('api/plan-orders', { planId: plan.id });
    ++refreshVersion;
    orders = [order, ...orders.filter(item => item.id !== order.id)];
    status.replaceChildren(document.createTextNode(`${plan.name} request saved. Send the prepared message in WhatsApp; downloads unlock after studio approval. `));
    const link = document.createElement('a'); link.href = order.whatsappUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Open WhatsApp Web'; status.append(link);
    if (whatsappTab && !whatsappTab.closed) whatsappTab.location.replace(order.whatsappUrl);
    await refresh();
  } catch (error) {
    if (whatsappTab && !whatsappTab.closed) whatsappTab.close();
    status.textContent = error.message;
    if (error.status === 401) { signedIn = false; login.hidden = false; }
  } finally { busy = false; controls(); }
});
let checked = false, freshRead = false;
const updates = createVisibleRefresh(async () => { const fresh = freshRead; freshRead = false; const result = await refresh(fresh); checked = true; return result; }, { interval: 60000, enabled: () => !busy && (!checked || signedIn) });
document.getElementById('refresh-plan-orders').addEventListener('click', () => { freshRead = true; checked = false; return updates.refresh(true); });
window.addEventListener('storage', event => { if (['viana-plan-orders-updated', 'viana_token'].includes(event.key) && !busy) { freshRead = true; checked = false; void updates.refresh(true); } });
// Check expiry locally; only authenticated visible pages refresh server state.
setInterval(() => { if (!document.hidden) controls(); }, 60000);
await updates.refresh();
