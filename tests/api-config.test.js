import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createApiResponseCache } from '../src/js/api-response-cache.js';

const source = readFileSync(new URL('../src/js/api-config.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
function client(href, stored = {}) {
  const requests = [];
  const context = vm.createContext({ URL, createApiResponseCache, window: { location: new URL(href) },
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

test('approved original download resolves the API base exactly once', async () => {
  const downloadSource = readFileSync(new URL('../src/js/download-access.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
  const { context } = client('https://raj-128.github.io/Viana/project.html', { viana_token: 'remote-token' });
  let url;
  context.fetch = async target => {
    url = target;
    return { ok: true, headers: { get: () => 'image/png' }, blob: async () => ({ size: 12 }) };
  };
  vm.runInContext(downloadSource, context);
  await vm.runInContext("requestProtectedDownload('design-a')", context);
  assert.equal(url, 'https://viana-fpph.onrender.com/api/designs/design-a/download');
});

test('production ignores browser-controlled destinations before sending credentials', async () => {
  const { context, requests } = client('https://studioviana.work.gd/login.html', {
    viana_token: 'private-session', viana_api_url: 'https://untrusted.example',
  });
  context.window.VIANA_API_URL = 'https://another-untrusted.example';
  context.document.querySelector = () => ({ getAttribute: () => 'https://third-untrusted.example' });
  await vm.runInContext("fetchApi('/api/auth/session')", context);
  assert.equal(new URL(requests[0].url).origin, 'https://viana-fpph.onrender.com');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer private-session');
});
