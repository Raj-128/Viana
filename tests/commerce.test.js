import test from "node:test";
import assert from "node:assert/strict";
import { createCommerceStore, CART_KEY, DOWNLOADS_KEY } from "../src/js/commerce-store.js";
import { requestProtectedDownload } from "../src/js/download-access.js";

const projects = Array.from({ length: 20 }, (_, i) => ({ id: `design-${i}`, title: `Wallpaper ${i}` }));
function fixture(initial = {}) {
  const data = new Map(Object.entries(initial));
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) };
  return { data, storage, store: createCommerceStore(storage, projects) };
}

test("cart keeps all designs, persists across instances, and does not duplicate repeat adds", () => {
  const { store, storage } = fixture();
  projects.forEach((project) => store.add(project));
  store.add(projects[0]);
  assert.equal(store.cart().length, 20);
  assert.equal(createCommerceStore(storage, projects).cart().length, 20);
});

test("quantity updates persist and are bounded; removal affects only the chosen item", () => {
  const { store } = fixture();
  store.add(projects[0]); store.add(projects[1]);
  store.quantity(projects[0].id, 3);
  assert.equal(store.cart()[0].quantity, 3);
  store.quantity(projects[0].id, -2);
  assert.equal(store.cart()[0].quantity, 1);
  store.quantity(projects[0].id, Infinity);
  assert.equal(store.cart()[0].quantity, 99);
  store.remove(CART_KEY, projects[1].id);
  assert.deepEqual(store.cart().map((item) => item.id), [projects[0].id]);
});

test("legacy cart migrates quantity; invalid and duplicate records are excluded", () => {
  const { store } = fixture({ [CART_KEY]: JSON.stringify([null, { id: projects[0].id, title: '<img onerror="bad()">' }, { id: projects[0].id }, { id: "unknown" }]) });
  assert.equal(store.cart().length, 1);
  assert.equal(store.cart()[0].quantity, 1);
  assert.equal(store.cart()[0].title, undefined);
});

test("malformed storage and disabled reads do not crash the catalogue", () => {
  assert.deepEqual(fixture({ [CART_KEY]: "{bad json" }).store.cart(), []);
  assert.deepEqual(fixture({ [CART_KEY]: "null" }).store.cart(), []);
  const store = createCommerceStore({ getItem() { throw new Error("Disabled"); }, setItem() { throw new Error("Disabled"); } }, projects);
  assert.deepEqual(store.cart(), []);
  assert.throws(() => store.add(projects[0]), /Disabled/);
});

test("download history persists once per design and removal does not affect cart", () => {
  const { store, storage } = fixture();
  store.add(projects[0]);
  store.recordDownload(projects[0]); store.recordDownload(projects[1]); store.recordDownload(projects[0]);
  assert.equal(store.downloads().length, 2);
  assert.equal(store.downloads()[0].id, projects[0].id);
  assert.ok(Date.parse(store.downloads()[0].downloadedAt));
  assert.equal(createCommerceStore(storage, projects).downloads().length, 2);
  store.remove(DOWNLOADS_KEY, projects[0].id);
  assert.equal(store.downloads().length, 1);
  assert.equal(store.cart().length, 1);
});

globalThis.window = { location: { href: "https://example.com/store/work.html" } };
test("download requests use the protected endpoint and same-origin credentials", async () => {
  const result = await requestProtectedDownload("design-1", async (url, options) => {
    assert.equal(url.href, "https://example.com/store/api/designs/design-1/download");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/png" } });
  });
  assert.equal(result.size, 3);
});

for (const [status, message] of [[401, /sign in/], [403, /access is required/], [404, /not available/], [429, /Too many/], [500, /not available/]]) {
  test(`download refuses HTTP ${status}`, async () => {
    await assert.rejects(requestProtectedDownload("design-0", async () => new Response(null, { status })), message);
  });
}

test("static HTML fallback, empty files, and script content never become downloads", async () => {
  for (const type of ["text/html", "application/javascript", "image/svg+xml"]) {
    await assert.rejects(requestProtectedDownload("design-0", async () => new Response("bad", { headers: { "content-type": type } })), /not configured/);
  }
  await assert.rejects(requestProtectedDownload("design-0", async () => new Response(null, { headers: { "content-type": "image/png" } })), /empty/);
});

test("browser payment and admin flags cannot unlock a denied download", async () => {
  globalThis.localStorage = { getItem: () => { throw new Error("Download must never consult browser payment flags"); } };
  await assert.rejects(requestProtectedDownload("design-0", async () => new Response(null, { status: 403 })), /access is required/);
});
