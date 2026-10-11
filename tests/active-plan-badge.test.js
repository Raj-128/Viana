import test from 'node:test';
import assert from 'node:assert/strict';
import { initActivePlanBadge } from '../src/js/active-plan-badge.js';

test('header shows only approved unexpired plan and clears on expiry or logout', async () => {
  const link = {}, events = {}, timers = [];
  const active = { status: 'approved', plan: { name: 'VIP Monthly' }, expires_at: Date.now() + 86400000 };
  let orders = [active], signedIn = true;
  const badge = initActivePlanBadge({
    document: { querySelectorAll: () => [link], addEventListener() {} },
    window: { clearTimeout() {}, setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; }, addEventListener: (type, fn) => { events[type] = fn; } },
    hasSession: () => signedIn,
    request: async () => ({ ok: signedIn, json: async () => ({ orders }) }),
  });
  await badge.refresh();
  assert.equal(link.textContent, 'VIP Monthly');
  assert.equal(timers.at(-1).delay, 300000);
  active.expires_at = Date.now() - 1;
  await timers.at(-1).fn();
  await badge.refresh();
  assert.equal(link.textContent, 'Plans');
  orders = [{ ...active, status: 'pending', expires_at: Date.now() + 10000 }];
  await events.focus();
  assert.equal(link.textContent, 'Plans');
  orders = [{ ...active, expires_at: Date.now() + 10000 }];
  await badge.refresh();
  assert.equal(link.textContent, 'VIP Monthly');
  signedIn = false;
  await badge.refresh();
  assert.equal(link.textContent, 'Plans');
});
