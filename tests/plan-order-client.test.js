import { createVisibleRefresh } from '../src/js/visible-refresh.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { downloadPlans, downloadFormats, planLimitLabel } from '../src/js/download-plans.js';
import { planWhatsAppUrl } from '../src/js/plan-whatsapp.js';

async function page({ popupBlocked = false, saveFails = false, signedIn = true, initialOrders = [], usedToday = 0, formatUsageToday = {} } = {}) {
  class Element {
    constructor() { this.children = []; this.handlers = {}; this.textContent = ''; this.dataset = {}; }
    append(...items) { this.children.push(...items); }
    replaceChildren(...items) { this.children = items; }
    addEventListener(type, fn) { this.handlers[type] = fn; }
    focus() { this.focused = true; }
    after(item) { this.afterElement = item; }
    before(item) { this.beforeElement = item; }
  }
  const nodes = Object.fromEntries(['plan-order-status', 'plan-order-history', 'plan-order-login', 'refresh-plan-orders'].map(id => [id, new Element()]));
  const buttons = downloadPlans.map(plan => {
    const button = new Element(), features = new Element(), dd = new Element();
    const formats = Object.fromEntries(downloadFormats.map(format => [format.id, new Element()]));
    features.firstElementChild = new Element(); features.querySelector = selector => selector === 'dd' ? dd : formats[selector.match(/"([^"]+)"/)[1]];
    button.limit = dd; button.formatCounts = formats;
    button.dataset = { orderPlan: plan.id }; button.closest = () => ({ querySelector: selector => selector === '.plan-purchase-status' ? button.beforeElement : features });
    return button;
  });
  const events = [], intervals = [], email = 'real+customer@example.com';
  let orders = initialOrders;
  const context = {
    downloadPlans, downloadFormats, planLimitLabel,
    createVisibleRefresh: (task, options) => createVisibleRefresh(task, { ...options, document: context.document, window: context.window }),
    renderRecentDownloads() {},
    setInterval(fn, delay) { intervals.push({ fn, delay }); },
    document: { addEventListener() {}, getElementById: id => nodes[id], querySelectorAll: () => buttons,
      createElement: () => new Element(), createTextNode: text => ({ textContent: text }) },
    window: { clearTimeout() {}, setTimeout(fn, delay) { intervals.push({ fn, delay }); return intervals.length; }, addEventListener() {}, open: url => { events.push(['open', url]); return popupBlocked ? null : {
      location: { replace: url => events.push(['navigate', url]) }, close: () => events.push(['close']) }; } },
    fetchApi: async (path, options) => {
      if (!signedIn) return { ok: false, status: 401, json: async () => ({ error: 'Please sign in.' }) };
      if (options.method === 'POST') {
        events.push(['save', JSON.parse(options.body)]);
        if (saveFails) return { ok: false, status: 500, json: async () => ({ error: 'Save failed.' }) };
        const plan = downloadPlans.find(plan => plan.id === JSON.parse(options.body).planId);
        const order = { id: 'order-123', plan, status: 'pending' };
        order.whatsappUrl = planWhatsAppUrl(order, email); orders = [order];
        return { ok: true, json: async () => ({ order }) };
      }
      return { ok: true, json: async () => ({ email, orders, usedToday, formatUsageToday }) };
    },
  };
  const source = readFileSync(new URL('../src/js/plan-order-page.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  await vm.runInNewContext(`(async () => { ${source} })()`, context);
  return { buttons, nodes, events, intervals, setOrders(value) { orders = value; } };
}

test('order saves before WhatsApp navigation and pending order can be reopened', async () => {
  const { buttons, events } = await page();
  await buttons[0].handlers.click();
  assert.deepEqual(events.map(event => event[0]), ['open', 'save', 'navigate']);
  const text = new URL(events[2][1]).searchParams.get('text');
  assert.match(text, /Login email: real\+customer@example.com/);
  assert.match(text, /automatically expires 30 days after admin approval/);
  assert.match(text, /3ds Max: 9 files\/day/);
  assert.equal(buttons[0].disabled, false);
  assert.equal(buttons[1].disabled, true);
  await buttons[0].handlers.click();
  assert.equal(events.filter(event => event[0] === 'navigate').length, 2);
});

test('popup blocking leaves a working manual WhatsApp link after saved request', async () => {
  const { buttons, nodes, events } = await page({ popupBlocked: true });
  await buttons[0].handlers.click();
  assert.equal(events.some(event => event[0] === 'navigate'), false);
  const link = nodes['plan-order-status'].children.find(item => item.href);
  // api.whatsapp.com hands a phone to the installed app and offers a desktop
  // visitor the choice; web.whatsapp.com forced the browser client on both.
  assert.equal(new URL(link.href).hostname, 'api.whatsapp.com');
});

test('failed save closes reserved tab; signed-out user cannot open WhatsApp', async () => {
  const failed = await page({ saveFails: true });
  await failed.buttons[0].handlers.click();
  assert.deepEqual(failed.events.map(event => event[0]), ['open', 'save', 'close']);
  const guest = await page({ signedIn: false });
  await guest.buttons[0].handlers.click();
  assert.equal(guest.events.length, 0);
  assert.equal(guest.nodes['plan-order-login'].focused, true);
});

test('paid active card shows Purchased and expired purchases offer renewal', async () => {
  const order = { id: 'paid', plan: downloadPlans[0], status: 'approved', paymentStatus: 'paid', approved_at: Date.now() - 1000, expires_at: Date.now() + 100000, usedTotal: 0 };
  const active = await page({ initialOrders: [order] });
  assert.equal(active.buttons[0].textContent, 'Purchased');
  assert.equal(active.buttons[0].disabled, true);
  assert.equal(active.buttons[0].beforeElement.textContent, 'Paid · Purchased');
  const expired = await page({ initialOrders: [{ ...order, status: 'expired', expires_at: Date.now() - 1 }] });
  assert.equal(expired.buttons[0].textContent, 'Renew plan');
  assert.equal(expired.buttons[0].disabled, false);
  assert.equal(expired.buttons[0].beforeElement.textContent, 'Paid · Purchased · Expired');
});

test('open customer card changes from Pending to Purchased after admin approval without reload', async () => {
  const pending = { id: 'request-1', plan: downloadPlans[0], status: 'pending', approved_at: null };
  const client = await page({ initialOrders: [pending] });
  assert.equal(client.buttons[0].textContent, 'Open WhatsApp · Pending');
  assert.equal(client.intervals.at(-1).delay, 60000);
  client.setOrders([{ ...pending, status: 'approved', approved_at: Date.now(), expires_at: Date.now() + 30 * 86400000, paymentStatus: 'paid' }]);
  await client.nodes['refresh-plan-orders'].handlers.click();
  assert.equal(client.buttons[0].textContent, 'Purchased');
  assert.equal(client.buttons[0].dataset.purchased, 'true');
  assert.equal(client.buttons[0].disabled, true);
  assert.equal(client.buttons[0].beforeElement.textContent, 'Paid · Purchased');
  assert.match(client.nodes['plan-order-status'].textContent, /purchased.*active/);
});

test('active plan shows remaining total and independent daily format balances', async () => {
  const order = { id: 'active', plan: downloadPlans[0], status: 'approved', approved_at: Date.now(), expires_at: Date.now() + 86400000, usedTotal: 1 };
  const client = await page({ initialOrders: [order], usedToday: 1, formatUsageToday: { max: 1, fbx: 4 } });
  assert.equal(client.buttons[0].limit.textContent, '99 / 100 files left this plan');
  assert.equal(client.buttons[0].formatCounts.max.textContent, '8 / 9 left today');
  assert.equal(client.buttons[0].formatCounts.fbx.textContent, '0 / 4 left today');
  assert.equal(client.buttons[0].formatCounts.obj.textContent, '4 / 4 left today');
  assert.equal(client.buttons[1].formatCounts.max.textContent, '12 / day');
});
