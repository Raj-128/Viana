import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { requestProtectedDownload } from '../src/js/download-access.js';

test('model download without active plan redirects, but quota and wallpaper failures do not', async () => {
  const file = readFileSync(new URL('../src/js/commerce.js', import.meta.url), 'utf8');
  const source = file.slice(file.indexOf('export async function downloadDesign'), file.indexOf('export function renderCommerce')).replace('export async function', 'async function');
  for (const scenario of [
    { type: '3d', error: { status: 403, code: 'PLAN_REQUIRED' }, redirect: true },
    { type: '3d', error: { status: 401 }, redirect: true },
    { type: '3d', error: { status: 429 }, redirect: false },
    { type: '3d', error: { status: 403 }, redirect: false },
    { type: '3d', error: { status: 500 }, redirect: false },
    { type: 'wallpaper', error: { status: 401 }, redirect: false },
  ]) {
    const redirects = [], drawers = [];
    const context = vm.createContext({
      store: {}, downloading: new Set(), selectedDownload: null, notice: '', URL,
      project: { id: 'asset', workType: scenario.type },
      hasDirectModelDownload: project => project.workType === '3d', renderCommerce() {}, announce() {},
      openCommerce: tab => drawers.push(tab),
      requestProtectedDownload: async () => { throw Object.assign(new Error('Download denied'), scenario.error); },
      window: { location: { href: 'https://example.com/store/project.html?id=asset', assign: url => redirects.push(url) } },
    });
    vm.runInContext(source, context);
    await vm.runInContext("downloadDesign(project, 'original')", context);
    assert.equal(redirects.length, scenario.redirect ? 1 : 0);
    if (scenario.redirect) {
      assert.equal(redirects[0], 'https://example.com/store/plans.html?notice=renew-plan');
      assert.equal(drawers.length, 0, 'no error drawer flashes during navigation');
    }
    assert.equal(context.downloading.size, 0);
  }
});

test('download helper preserves server plan-required code', async () => {
  globalThis.window = { location: { href: 'https://example.com/' } };
  await assert.rejects(requestProtectedDownload('asset', async () => new Response(JSON.stringify({ error: 'Choose a plan', code: 'PLAN_REQUIRED' }), { status: 403 })),
    { message: 'Choose a plan', code: 'PLAN_REQUIRED', status: 403 });
});

test('plans notification is shown only after plan-required redirect', () => {
  const source = readFileSync(new URL('../src/js/plans-notice.js', import.meta.url), 'utf8');
  for (const search of ['', '?notice=renew-plan']) {
    const notice = { hidden: true };
    const timers = [];
    vm.runInNewContext(source, { document: { getElementById: () => notice }, window: { location: { search } }, URLSearchParams,
      setTimeout: (callback, delay) => timers.push({ callback, delay }),
    });
    assert.equal(notice.hidden, !search);
    assert.equal(timers.length, search ? 1 : 0);
    if (search) {
      assert.equal(timers[0].delay, 20_000);
      timers[0].callback();
      assert.equal(notice.hidden, true);
    }
  }
});

test('authorized model downloads once and saves history without opening options', async () => {
  const file = readFileSync(new URL('../src/js/commerce.js', import.meta.url), 'utf8');
  const source = file.slice(file.indexOf('export async function downloadDesign'), file.indexOf('export function renderCommerce')).replace('export async function', 'async function');
  let downloads = 0, history = 0, drawers = 0;
  const link = { click: () => downloads++, remove() {} };
  const context = vm.createContext({ project: { id: 'model', workType: '3d', title: 'Model' }, store: { recordDownload: () => history++ },
    downloading: new Set(), selectedDownload: null, notice: '', hasDirectModelDownload: () => true,
    requestProtectedDownload: async () => ({ type: 'application/vnd.rar' }), renderCommerce() {}, announce() {}, onChange() {},
    save: action => { action(); return true; }, openCommerce: () => drawers++, setTimeout() {},
    URL: { createObjectURL: () => 'blob:model-file' }, document: { createElement: () => link, body: { append() {} } },
  });
  vm.runInContext(source, context);
  await vm.runInContext('downloadDesign(project)', context);
  assert.equal(downloads, 1);
  assert.equal(history, 1);
  assert.equal(drawers, 0);
  assert.match(link.download, /\.rar$/);
});
