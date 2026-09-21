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
