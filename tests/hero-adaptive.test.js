import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { corridorTransform, galleryTransform, heroFrames } from '../src/js/hero-projection.js';
import { selectHeroDesigns, selectRecentModels } from '../src/js/hero-designs.js';

test('hero automatically switches between bounded animation and a still gallery', () => {
  const makeElement = () => ({ children: [], dataset: {}, style: { setProperty() {} },
    append(...nodes) { this.children.push(...nodes); }, replaceChildren() { this.children = []; }, setAttribute() {} });
  const wallpaper = makeElement(), models = makeElement(), hero = makeElement();
  let offscreen = false, visible, modeChanged, motion = true;
  hero.classList = { toggle(name, value) { if (name === 'stream-offscreen') offscreen = value; } };
  hero.querySelectorAll = () => [wallpaper, models];
  hero.querySelector = selector => selector.includes('"3d"') ? models : wallpaper;
  const events = {}, media = { matches: true, addEventListener(name, fn) { this.change = fn; } };
  const document = { documentElement: { dataset: {} }, querySelector: () => hero, createElement: makeElement };
  const projects = [
    ...Array.from({ length: 18 }, (_, i) => ({ id: `wall-${i}`, title: `Art ${i}`, workType: 'wallpaper', cover: `image-${i}`, heroCover: `thumb-${i}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ id: `model-${i}`, title: `Model ${i}`, workType: '3d', cover: `model-${i}`, sourceFiles: [{}], addedAt: '2026-10-01' })),
  ];
  vm.runInNewContext(readFileSync(new URL('../src/js/image-stream-hero.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, ''), {
    projects, document, window: { matchMedia: () => media, addEventListener(name, fn) { events[name] = fn; } },
    allowsMotion: () => motion, selectHeroDesigns, selectRecentModels, corridorTransform, galleryTransform, heroFrames,
    MutationObserver: class { constructor(fn) { modeChanged = fn; } observe() {} },
    IntersectionObserver: class { constructor(fn) { visible = fn; } observe() {} },
  });
  assert.equal(wallpaper.children.length, 18);
  assert.equal(models.children.length, 0, 'inactive collection loads no images');
  assert.equal(wallpaper.children[0].style.animationIterationCount, 'infinite');
  visible([{ isIntersecting: false }]); assert.equal(offscreen, true);
  visible([{ isIntersecting: true }]); assert.equal(offscreen, false);
  // Without motion the corridor is held still rather than replaced: the whole
  // collection stays on screen, carrying its position but no animation.
  motion = false; events['studio:motion-change']();
  assert.equal(hero.dataset.presentation, 'corridor');
  assert.equal(wallpaper.children.length, 18);
  assert.equal(wallpaper.children[0].style.animationName, undefined);
  assert.ok(wallpaper.children[0].style.transform, 'a still card keeps its place on the path');
  assert.ok(Number(wallpaper.children[8].style.zIndex) > Number(wallpaper.children[0].style.zIndex),
    'depth order the keyframes would have applied is set directly');
  document.documentElement.dataset.studioMode = '3d'; modeChanged();
  assert.equal(wallpaper.children.length, 0);
  assert.equal(models.children.length, 6);
  motion = true; events['studio:motion-change']();
  assert.equal(models.children.length, 6);
  media.matches = false; media.change();
  assert.equal(models.children.length, 3, 'small screens use the still layout');
  assert.equal(hero.dataset.presentation, 'still');
});

test('motion is automatic and no entry page exposes a settings button', () => {
  for (const page of ['index', 'about', 'contact', 'services', 'work', 'project', 'plans', 'login', 'admin-login', 'admin-downloads']) {
    assert.doesNotMatch(readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8'), /data-motion-toggle|Motion: automatic|Motion: reduced/);
  }
  assert.doesNotMatch(readFileSync(new URL('../src/js/motion-policy.js', import.meta.url), 'utf8'), /localStorage|studioMotion/);
});
