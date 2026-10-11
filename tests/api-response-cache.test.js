import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiResponseCache } from '../src/js/api-response-cache.js';

function fixture() {
  const data = new Map();
  const storage = { get length() { return data.size; }, key: i => [...data.keys()][i],
    getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  let time = 1000, calls = 0;
  const options = { storage: () => storage, now: () => time, hash: async token => `hash-${token}` };
  const cache = createApiResponseCache(options);
  const network = async () => { calls++; return Response.json({ count: calls }); };
  const get = (path = '/api/plan-orders', token = 'alice', opts = {}, from = cache, fetch = network) => from.request(`https://api.example${path}`, opts, token, fetch);
  return { data, storage, options, cache, get, network, calls: () => calls, advance: n => { time += n; } };
}

test('fresh data persists across page instances; expiry and manual refresh reach the server', async () => {
  const f = fixture();
  assert.equal((await (await f.get()).json()).count, 1);
  const otherPage = createApiResponseCache(f.options);
  assert.equal((await f.get(undefined, undefined, {}, otherPage)).headers.get('X-Viana-Cache'), 'hit');
  assert.equal(f.calls(), 1);
  await f.get(undefined, undefined, { cache: 'reload' }); assert.equal(f.calls(), 2);
  f.advance(120001); await f.get(); assert.equal(f.calls(), 3);
});

test('accounts are isolated; authentication, admin data, guests and files are never cached', async () => {
  const f = fixture();
  await f.get(); await f.get(undefined, 'bob'); assert.equal(f.calls(), 2);
  await f.get(); assert.equal(f.calls(), 2);
  for (const path of ['/api/auth/session', '/api/admin/plan-orders', '/api/designs/model/download']) {
    await f.get(path); await f.get(path);
  }
  assert.equal(f.calls(), 8);
  await f.get(undefined, ''); await f.get(undefined, ''); assert.equal(f.calls(), 10);
});

test('parallel reads share one response; successful writes and downloads invalidate it', async () => {
  const f = fixture();
  const responses = await Promise.all([f.get(), f.get(), f.get()]);
  assert.equal(f.calls(), 1);
  for (const response of responses) assert.equal((await response.json()).count, 1);
  await f.get('/api/plan-orders', 'alice', { method: 'POST' });
  await f.get(); assert.equal(f.calls(), 3);
  await f.get('/api/designs/model/download');
  await f.get(); assert.equal(f.calls(), 5);
});

test('clearing during an in-flight read prevents stale data from being saved', async () => {
  const f = fixture(); let finish;
  const pending = f.get(undefined, undefined, {}, f.cache, () => new Promise(resolve => { finish = resolve; }));
  await Promise.resolve(); await Promise.resolve();
  // Another tab invalidates the shared storage while this tab awaits the API.
  createApiResponseCache(f.options).clear();
  finish(Response.json({ stale: true })); await pending;
  const response = await f.get(); assert.equal((await response.json()).count, 1);
  f.cache.clear();
  assert.equal([...f.data.keys()].filter(key => key.startsWith('viana:api-cache:v1:')).length, 0);
});

test('storage failure, corrupt data and server errors never block or become cached successes', async () => {
  const f = fixture(); await f.get();
  const key = [...f.data.keys()].find(key => key.includes(':v1:'));
  f.data.set(key, 'broken JSON'); await f.get(); assert.equal(f.calls(), 2);
  f.cache.clear();
  await f.get(undefined, undefined, {}, f.cache, async () => Response.json({ error: 'offline' }, { status: 503 }));
  await f.get(); assert.equal(f.calls(), 3);
  const blocked = createApiResponseCache({ ...f.options, storage: () => { throw Error('denied'); } });
  await f.get(undefined, undefined, {}, blocked); await f.get(undefined, undefined, {}, blocked);
  assert.equal(f.calls(), 5);
});
