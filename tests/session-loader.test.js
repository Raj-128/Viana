import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionLoader } from '../src/js/session-loader.js';

function setup(request = async () => ({ user: { id: 'customer' } })) {
  const values = new Map();
  let time = 100000, calls = 0;
  const options = { request: () => { calls++; return request(); }, key: 'session:token',
    storage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }, now: () => time };
  return { load: createSessionLoader(options), options, calls: () => calls, advance: ms => { time += ms; } };
}

test('guest pages need no session API and navigation reuses a recent check', async () => {
  const state = setup();
  assert.equal((await state.load({ publicPage: true })).user, null);
  assert.equal(state.calls(), 0);
  const options = { publicPage: true, hasToken: true };
  assert.equal((await state.load(options)).user.id, 'customer');
  const nextPage = createSessionLoader(state.options);
  await nextPage(options);
  assert.equal(state.calls(), 1);
  state.advance(60001);
  await nextPage(options);
  assert.equal(state.calls(), 2);
  await nextPage();
  assert.equal(state.calls(), 3, 'explicit refresh and admin pages bypass the cache');
});

test('concurrent session requests share one request and failures can retry', async () => {
  let finish;
  const state = setup(() => new Promise(resolve => { finish = resolve; }));
  const first = state.load(), second = state.load();
  assert.equal(first, second);
  assert.equal(state.calls(), 1);
  finish({ user: null });
  await first;
  let calls = 0;
  const load = createSessionLoader({ key: 'session', storage: { getItem() { throw Error(); }, setItem() { throw Error(); } },
    request: async () => { if (++calls === 1) throw Error('offline'); return { user: null }; } });
  await assert.rejects(load(), /offline/);
  assert.equal((await load()).user, null);
});

test('changing accounts cannot reuse another account session cache', async () => {
  const state = setup();
  let token = 'first';
  const load = createSessionLoader({ ...state.options, key: () => token });
  await load({ publicPage: true, hasToken: true });
  token = 'second';
  await load({ publicPage: true, hasToken: true });
  assert.equal(state.calls(), 2);
  assert.equal((await load({ publicPage: true, hasToken: false })).user, null);
});
