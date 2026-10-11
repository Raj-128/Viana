import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("viewer initialization finds every control before catalogue startup continues", () => {
  const listeners = new Map();
  const dialog = {
    innerHTML: "",
    setAttribute() {},
    addEventListener() {},
    querySelector(selector) {
      const token = selector.startsWith("[") ? selector.slice(1, -1) : selector.slice(1);
      if (!this.innerHTML.includes(token)) return null;
      return { addEventListener(type, handler) { listeners.set(`${selector}:${type}`, handler); } };
    },
  };
  const source = readFileSync(new URL("../src/js/wallpaper-viewer.js", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace("export function", "function");
  const context = {
    projects: [], createCommerceStore: () => ({}),
    document: { createElement: () => dialog, body: { append() {} }, addEventListener() {} },
  };
  vm.runInNewContext(`${source}\ninitWallpaperViewer();`, context);
  assert.equal(typeof listeners.get("[data-add-design]:click"), "function");
  assert.equal(typeof listeners.get("[data-download-image]:click"), "function");
  assert.equal(typeof listeners.get("[data-viewer-close]:click"), "function");
});

test('3D preview download calls direct download instead of opening a details page', async () => {
  const source = readFileSync(new URL('../src/js/wallpaper-viewer.js', import.meta.url), 'utf8');
  const start = source.indexOf('  dialog.querySelector("[data-download-image]").addEventListener');
  const end = source.indexOf('  dialog.querySelector("[data-viewer-close]")', start);
  let click, closed = 0;
  const downloads = [];
  const project = { id: 'model', workType: '3d' };
  const context = { designs: [project], index: 0, downloadDesign: item => downloads.push(item.id),
    dialog: { close: () => closed++, querySelector: () => ({ addEventListener: (_, fn) => { click = fn; } }) },
    window: { location: { href: 'work.html' } } };
  vm.runInNewContext(source.slice(start, end), context);
  await click();
  assert.deepEqual(downloads, ['model']);
  assert.equal(closed, 1);
  assert.equal(context.window.location.href, 'work.html');
  project.workType = 'wallpaper';
  await click();
  assert.equal(context.window.location.href, 'project.html?id=model');
});
