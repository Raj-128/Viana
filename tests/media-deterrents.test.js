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
  const source = readFileSync(new URL("../src/js/media-deterrents.js", import.meta.url), "utf8").replace("export function", "function");
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
  let blocked = false;
  const event = { key: "s", ctrlKey: true, target: { closest: () => null }, preventDefault() { blocked = true; } };
  handlers.keydown(event); assert.equal(blocked, true);
  blocked = false;
  handlers.keydown({ ...event, target: { closest: () => ({}) } }); assert.equal(blocked, false);
  handlers.keydown({ ...event, key: "c" }); assert.equal(blocked, false);
});
