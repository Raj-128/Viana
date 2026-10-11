import test from 'node:test';
import assert from 'node:assert/strict';
import { initActivePlanBadge, planBadgeState } from '../src/js/active-plan-badge.js';

test('header shows active and expired plans, ignores pending orders and clears on logout', async () => {
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
  assert.equal(link.textContent, 'Plan expired');
  orders = [{ ...active, status: 'pending', expires_at: Date.now() + 10000 }];
  await badge.refresh();
  assert.equal(link.textContent, 'Plans');
  orders = [{ ...active, expires_at: Date.now() + 10000 }];
  await badge.refresh();
  assert.equal(link.textContent, 'VIP Monthly');
  signedIn = false;
  await badge.refresh();
  assert.equal(link.textContent, 'Plans');
});

test('plan expiry labels handle countdown, expired, pending and malformed dates', () => {
 const now=1000000000, day=86400000;
 const order={status:'approved',expires_at:now+2*day,plan:{name:'Basic - No Ads'}};
 assert.equal(planBadgeState(order,now).detail,'Expires in 2 days');
 assert.equal(planBadgeState({...order,expires_at:now+1000},now).detail,'Expires in under 1 day');
 assert.equal(planBadgeState({...order,expires_at:now+8*day},now).detail,'');
 assert.equal(planBadgeState({...order,expires_at:now},now).state,'expired');
 assert.equal(planBadgeState({...order,status:'pending'},now).label,'Plans');
 assert.equal(planBadgeState({...order,expires_at:'bad'},now).label,'Plans');
});
