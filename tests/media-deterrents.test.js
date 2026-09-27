import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("media deterrents conceal and restore previews without blocking form editing", () => {
  const handlers = {};
  let focused = true, concealed = false, timer;
  const document = {
    hidden: false, hasFocus: () => focused,
    documentElement: { dataset: {}, classList: { toggle: (name, state) => { concealed = state; } } },
    addEventListener: (type, handler) => { handlers[type] = handler; },
  };
  const window = { addEventListener: (type, handler) => { handlers[type] = handler; } };
  const source = readFileSync(new URL("../src/js/media-deterrents.js", import.meta.url), "utf8").replaceAll("export function", "function");
  vm.runInNewContext(`${source}\ninitMediaDeterrents();`, { document, window, clearTimeout() {}, setTimeout(callback) { timer = callback; } });
  assert.equal(concealed, false);
  focused = false; handlers.blur(); assert.equal(concealed, true);
  focused = true; handlers.focus(); assert.equal(concealed, false);
  document.hidden = true; handlers.visibilitychange(); assert.equal(concealed, true);
  document.hidden = false; handlers.visibilitychange(); assert.equal(concealed, false);
  handlers.beforeprint(); assert.equal(concealed, true);
  handlers.afterprint(); assert.equal(concealed, false);
  handlers.keydown({ key: "PrintScreen" }); assert.equal(concealed, true);
  timer(); assert.equal(concealed, false);
  for (const key of ['s', '3', '4', '5']) {
    handlers.keydown({ key, metaKey: true, shiftKey: true });
    assert.equal(concealed, true, 'capture shortcuts conceal previews when the browser delivers the event');
    timer(); assert.equal(concealed, false);
  }
  let blocked = false;
  const event = { key: "s", ctrlKey: true, target: { closest: () => null }, preventDefault() { blocked = true; } };
  handlers.keydown(event); assert.equal(blocked, true);
  blocked = false;
  handlers.keydown({ ...event, target: { closest: () => ({}) } }); assert.equal(blocked, false);
  handlers.keydown({ ...event, key: "c" }); assert.equal(blocked, false);
  for (const type of ['contextmenu', 'dragstart', 'selectstart']) {
    blocked = false;
    const artwork = { closest: selector => selector.startsWith('input') ? null : {} };
    handlers[type]({ target: artwork, preventDefault() { blocked = true; } });
    assert.equal(blocked, true, `${type} is prevented on dynamically added artwork`);
    blocked = false;
    handlers[type]({ target: { closest: () => ({}) }, preventDefault() { blocked = true; } });
    assert.equal(blocked, false, `${type} stays available in editable controls`);
  }
  assert.equal(handlers.click, undefined, 'artwork navigation remains clickable');
});

test('viewer watermarks use a short account reference without marking browsing cards', () => {
  const container = { children: [], querySelector() { return this.children[0]; }, append(child) { this.children.push(child); } };
  let selector;
  const document = {
    querySelectorAll(value) { selector = value; return [container]; },
    createElement() { return { children: [], setAttribute() {}, append(child) { this.children.push(child); } }; },
  };
  const source = readFileSync(new URL('../src/js/media-deterrents.js', import.meta.url), 'utf8').replaceAll('export function', 'function');
  const context = { document };
  vm.createContext(context); vm.runInContext(source, context);
  vm.runInContext("addViewerWatermarks({id:'11111111-1234-1234-1234-abcdef123456', email:'private@example.com'}); addViewerWatermarks({id:'same'});", context);
  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].children.length, 3);
  assert.match(container.children[0].children[0].textContent, /Viewer ef123456/);
  assert.doesNotMatch(container.children[0].children[0].textContent, /private@example/);
  assert.doesNotMatch(selector, /image-stream|hero-slide|catalogue-card/);
});
