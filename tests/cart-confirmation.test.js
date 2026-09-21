import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createCommerceStore, CART_KEY } from "../src/js/commerce-store.js";

test("second cart click requires confirmation; cancel retains item and confirm removes it", () => {
  const project = { id: "wallpaper", title: "Test wallpaper" };
  const data = new Map();
  const store = createCommerceStore({ getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) }, [project]);
  let confirmed = false, prompts = 0, updates = 0;
  const source = readFileSync(new URL("../src/js/commerce.js", import.meta.url), "utf8");
  const functions = source.slice(source.indexOf("export function addToCart"), source.indexOf("export function openCommerce")).replace("export function", "function");
  const context = vm.createContext({ store, CART_KEY, project, save: (action) => { action(); return true; },
    onChange: () => updates++, announce() {}, window: { confirm: (message) => { prompts++; assert.match(message, /Test wallpaper/); return confirmed; } } });
  vm.runInContext(functions, context);
  vm.runInContext("addToCart(project)", context);
  assert.equal(store.cart().length, 1); assert.equal(prompts, 0);
  vm.runInContext("addToCart(project)", context);
  assert.equal(store.cart().length, 1); assert.equal(prompts, 1); assert.equal(updates, 1);
  confirmed = true;
  vm.runInContext("addToCart(project)", context);
  assert.equal(store.cart().length, 0); assert.equal(prompts, 2); assert.equal(updates, 2);
});
