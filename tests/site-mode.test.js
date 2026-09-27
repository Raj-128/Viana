import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const themeSource = readFileSync(new URL("../src/js/site-mode.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replaceAll("export ", "");
test("saved 3D mode survives navigation, back navigation and cross-tab changes", () => {
  let saved = "3d";
  for (const page of ["index", "work", "about", "services", "contact", "project", "login", "admin-login"]) {
    const listeners = new Map(), classes = new Set();
    const context = {
      location: { pathname: `/${page}.html` },
      localStorage: { getItem: () => saved },
      document: { documentElement: { dataset: {} }, body: { classList: { toggle(name, on) { on ? classes.add(name) : classes.delete(name); } } } },
      window: { addEventListener: (name, callback) => listeners.set(name, callback) },
    };
    saved = "3d";
    vm.runInNewContext(themeSource, context);
    assert.equal(classes.has("mode-3d"), true, page);
    saved = "wallpaper";
    listeners.get("pageshow")();
    assert.equal(classes.has("mode-wallpaper"), true);
    assert.equal(classes.has("mode-3d"), false);
    saved = "3d";
    listeners.get("storage")({ key: "studioMode" });
    assert.equal(classes.has("mode-3d"), true);
    saved = null;
    listeners.get("storage")({ key: null });
    assert.equal(classes.has("mode-wallpaper"), true);
    assert.equal(vm.runInNewContext("readStudioMode({ getItem() { throw Error('blocked'); } });", context), "wallpaper");
  }
});

test("secondary page copy and render images restore after switching back to wallpaper", () => {
  const source = readFileSync(new URL("../src/js/mode-content.js", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replaceAll("export ", "");
  for (const page of ["about", "services", "contact"]) {
    const elements = new Map();
    const element = (selector) => {
      if (!elements.has(selector)) elements.set(selector, {
        innerHTML: "Original <br> wallpaper copy", attributes: { src: "wallpaper.jpg", alt: "Wallpaper" },
        set textContent(value) { this.innerHTML = value; },
        getAttribute(key) { return this.attributes[key] ?? null; },
        setAttribute(key, value) { this.attributes[key] = value; },
        removeAttribute(key) { delete this.attributes[key]; },
      });
      return elements.get(selector);
    };
    const context = {
      projects: [{ id: "scene", title: "Render study", cover: "render.png", workType: "3d" }],
      location: { pathname: `/${page}.html` },
      document: { body: { dataset: {} }, querySelector: () => null,
        querySelectorAll: (selector) => selector === ".showcase-track .showcase-item" ? [] : [element(selector)] },
    };
    vm.runInNewContext(`${source}\nupdateModeContent('3d');`, context);
    const target = element(page === "work" ? ".hero-slide:nth-child(1) img" : ".page-hero .page-title");
    if (page === "work") assert.equal(target.attributes.src, "render.png");
    else assert.notEqual(target.innerHTML, "Original <br> wallpaper copy");
    vm.runInNewContext("updateModeContent('3d'); updateModeContent('wallpaper');", context);
    if (page === "work") assert.equal(target.attributes.src, "wallpaper.jpg");
    else assert.equal(target.innerHTML, "Original <br> wallpaper copy");
  }
});

test("work carousel switches clean thumbnails and matching detail IDs together", () => {
  const source = readFileSync(new URL("../src/js/mode-content.js", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replaceAll("export ", "");
  const parts = { img: {}, strong: {}, ".hero-slide-caption span": {} };
  const slide = { dataset: {}, querySelector: selector => parts[selector] };
  const context = {
    projects: [
      { id: "wall", title: "Wallpaper", workType: "wallpaper", heroCover: "clean.jpg", thumbnail: "clean.jpg", cover: "watermarked.jpg" },
      { id: "scene", title: "3D", workType: "3d", cover: "render.jpg" }
    ],
    location: { pathname: "/work.html" },
    document: { body: { dataset: {} }, querySelectorAll: () => [slide] }
  };
  vm.runInNewContext(source, context);
  for (const mode of ["wallpaper", "3d", "wallpaper"]) {
    vm.runInNewContext("updateModeContent('" + mode + "')", context);
    assert.equal(parts.img.src, mode === "3d" ? "render.jpg" : "clean.jpg");
    assert.equal(slide.dataset.projectId, mode === "3d" ? "scene" : "wall");
  }
});
