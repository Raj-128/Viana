import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/js/api-config.js', import.meta.url), 'utf8').replaceAll('export ', '');
function client(href, stored = {}) {
  const requests = [];
  const context = vm.createContext({ URL, window: { location: new URL(href) },
    document: { querySelector: () => null },
    localStorage: { getItem: key => stored[key] || null, setItem: (key, value) => stored[key] = value, removeItem: key => delete stored[key] },
    fetch: async (url, options) => { requests.push({ url, options }); return { ok: true }; },
  });
  vm.runInContext(source, context);
  return { context, requests };
}

test('localhost uses the running local API even with a saved cloud URL/token', async () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    const { context, requests } = client(`http://${host}:5173/admin-login.html`, {
      viana_api_url: 'https://old-api.example', viana_token: 'old-cloud-token',
    });
    await vm.runInContext("fetchApi('/api/auth/session')", context);
    assert.equal(requests[0].url, `http://${host}:5173/api/auth/session`);
    assert.equal(requests[0].options.credentials, 'include');
    assert.equal(requests[0].options.headers.Authorization, undefined);
  }
});

test('the deployed site still uses its Render API and bearer session', async () => {
  const { context, requests } = client('https://raj-128.github.io/Viana/login.html', { viana_token: 'remote-token' });
  await vm.runInContext("fetchApi('/api/auth/session')", context);
  assert.equal(requests[0].url, 'https://viana-fpph.onrender.com/api/auth/session');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer remote-token');
});
