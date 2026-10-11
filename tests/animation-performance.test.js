import test from 'node:test';
import assert from 'node:assert/strict';
import { motionLevel } from '../src/js/motion-policy.js';
import { createVisibleRefresh } from '../src/js/visible-refresh.js';

function clock() {
  let time = 0, id = 0;
  const timers = new Map(), events = {}, visibility = {};
  const window = { setTimeout(fn, delay) { timers.set(++id, { fn, delay }); return id; }, clearTimeout(id) { timers.delete(id); }, addEventListener(name, fn) { events[name] = fn; } };
  const document = { hidden: false, addEventListener(name, fn) { visibility[name] = fn; } };
  return { window, document, timers, events, visibility, now: () => time, advance: value => { time += value; } };
}
test('motion respects accessibility and low-end hardware without disabling capable touch PCs', () => {
  assert.equal(motionLevel({ cores: 8, memory: 8 }), 'full');
  for (const hint of [{ cores: 2 }, { cores: 4, memory: 4 }, { saveData: true }, { reduced: true }]) {
    assert.equal(motionLevel({ cores: 16, memory: 16, ...hint }), 'reduced');
  }
  assert.equal(motionLevel({}), 'full', 'missing hints do not make the app unusable');
  assert.equal(motionLevel({ cores: 8, memory: 4, coarse: true }), 'full');
  assert.equal(motionLevel({ cores: 4, memory: 8 }), 'full');
  assert.equal(motionLevel({ cores: 4 }), 'full');
});
test('refresh deduplicates requests, throttles focus and stops network work in hidden tabs', async () => {
  const c = clock(); let calls = 0, release;
  const updates = createVisibleRefresh(() => { calls++; return new Promise(resolve => { release = resolve; }); }, { ...c, interval: 60000 });
  const first = updates.refresh(); const same = updates.refresh(true);
  await Promise.resolve();
  assert.equal(first, same); assert.equal(calls, 1);
  release(); await first;
  c.events.focus(); c.visibility.visibilitychange();
  assert.equal(calls, 1);
  c.document.hidden = true; c.visibility.visibilitychange();
  assert.equal(c.timers.size, 0);
  c.advance(60000); await updates.refresh(true); assert.equal(calls, 1);
  c.document.hidden = false; c.visibility.visibilitychange(); await Promise.resolve();
  assert.equal(calls, 2); release(); await updates.refresh();
  c.events.pagehide(); assert.equal(c.timers.size, 0);
});
test('failed refreshes back off and disabled consumers never request', async () => {
  const c = clock(); let enabled = false, calls = 0;
  const updates = createVisibleRefresh(() => { calls++; throw Error('offline'); }, { ...c, enabled: () => enabled, interval: 60000 });
  await updates.refresh(); assert.equal(calls, 0);
  enabled = true; await updates.refresh();
  assert.equal([...c.timers.values()][0].delay, 120000);
  c.advance(120000); await updates.refresh();
  assert.equal([...c.timers.values()][0].delay, 240000);
});
