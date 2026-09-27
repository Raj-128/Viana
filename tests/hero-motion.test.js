import test from 'node:test';
import assert from 'node:assert/strict';
import { corridorPose, corridorTransform, galleryTransform } from '../src/js/hero-motion.js';

test('wallpaper screen positions preserve the reference perspective curve', () => {
  for (let index = 0; index <= 100; index++) {
    const u = index / 100;
    const expectedSize = 2.6 * Math.pow(46 / 2.6, u);
    const depth = 30 * (1 - 25 / expectedSize);
    const projection = 30 / (30 - depth);
    const rail = 44 - 55 * Math.pow(1 - u, 3.3);
    const right = corridorPose(u, 1);
    const left = corridorPose(u, -1);
    assert.ok(Math.abs(right.x - rail * projection) < 1e-9);
    assert.ok(Math.abs(right.scale * 25 - expectedSize) < 1e-9);
    assert.equal(right.x, -left.x);
    assert.ok(Number.isFinite(right.x));
    // No full-size card can fall back into the central throat.
    if (Math.abs(right.x) < 2) assert.ok(right.scale * 25 < 5);
  }
  const exit = corridorPose(1, 1);
  assert.ok(exit.x - 9 * exit.scale > 50, 'loop resets beyond the viewport');
});

test('motion transforms have no shared Z translation or vertical travel', () => {
  for (const u of [0, .125, .5, .875, 1]) {
    assert.match(corridorTransform(u, 1), /translate3d\([^,]+,0,0\)/);
    assert.match(galleryTransform(u), /translate3d\(calc\(var\(--gallery-span\) \* [-\d.]+\),0,0\)/);
  }
});

test('nine 3D cards fit their loop with room for the hover lift at mobile and desktop sizes', () => {
  for (const viewport of [320, 390, 600, 768, 1280, 1920, 2560]) {
    const width = viewport <= 600 ? .42 * viewport : Math.min(380, Math.max(200, .26 * viewport));
    const gap = Math.min(52, Math.max(24, .03 * viewport));
    const span = (width + gap) * 9;
    assert.ok(span / 9 > width * 1.04);
    assert.ok(span / 2 - width / 2 > viewport / 2, 'loop reset is offscreen');
  }
});
