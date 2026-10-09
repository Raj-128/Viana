import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function harness() {
  let id = 0;
  const frames = new Map();
  const target = () => ({ listeners: {}, addEventListener(name, callback) { this.listeners[name] = callback; } });
  const document = { ...target(), hidden: false };
  const window = { ...target(), requestAnimationFrame(callback) { frames.set(++id, callback); return id; }, cancelAnimationFrame(id) { frames.delete(id); } };
  const flush = time => { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(time)); };
  return { document, window, frames, flush };
}

test('marquee pauses offscreen and does not read layout in animation frames', () => {
  const h = harness();
  let reads = 0, intersect, resize;
  const track = { style: {}, get scrollWidth() { reads++; return 1000; } };
  h.document.querySelectorAll = () => [track];
  h.window.matchMedia = () => ({ matches: false, addEventListener() {} });
  const source = readFileSync(new URL('../src/js/premium.js', import.meta.url), 'utf8');
  vm.runInNewContext(source.slice(0, source.indexOf('function initCounters()')) + '\ninitTrustMarquee();', {
    ...h, requestAnimationFrame: h.window.requestAnimationFrame, cancelAnimationFrame: h.window.cancelAnimationFrame,
    ResizeObserver: class { constructor(fn) { resize = fn; } observe() {} },
    IntersectionObserver: class { constructor(fn) { intersect = fn; } observe() {} },
  });
  assert.equal(h.frames.size, 0);
  intersect([{ isIntersecting: true }]);
  h.flush(16); h.flush(32); h.flush(48);
  assert.equal(reads, 1);
  assert.notEqual(track.style.transform, 'translate3d(0px, 0, 0)');
  intersect([{ isIntersecting: false }]);
  assert.equal(h.frames.size, 0);
  resize();
  assert.equal(reads, 2);
  assert.equal(h.frames.size, 0);
  intersect([{ isIntersecting: true }]);
  assert.equal(h.frames.size, 1);
  h.document.hidden = true;
  h.document.listeners.visibilitychange();
  assert.equal(h.frames.size, 0);
});
