import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('wallpaper actions preserve disabled states and do not lock other admin panels', async () => {
  const code = readFileSync(new URL('../src/js/admin-downloads.js', import.meta.url), 'utf8');
  const run = code.slice(code.indexOf('async function run('), code.indexOf('function changeAccess('));
  const buttons = [false, true].map(disabled => ({ disabled, isConnected: true }));
  const attrs = {};
  const panel = { querySelectorAll: () => buttons, setAttribute: (key, value) => { attrs[key] = value; } };
  const status = {};
  const context = vm.createContext({
    status, $: id => { assert.equal(id, 'panel-wallpaper'); return panel; },
    refresh: async () => {}, uploadState() {}, renderPrintRequests() {},
  });
  vm.runInContext('let busy = false;' + run, context);
  await context.run(async () => {
    assert.deepEqual(buttons.map(button => button.disabled), [true, true]);
    assert.equal(attrs['aria-busy'], 'true');
    // A duplicate click cannot start a second action while the first is running.
    await context.run(() => { throw Error('Duplicate action'); }, 'duplicate');
  }, 'Saved');
  assert.deepEqual(buttons.map(button => button.disabled), [false, true]);
  assert.equal(status.textContent, 'Saved');
  await context.run(async () => { throw Error('Upload failed'); }, 'Saved');
  assert.equal(status.textContent, 'Upload failed');
  assert.equal(attrs['aria-busy'], 'false');
  assert.deepEqual(buttons.map(button => button.disabled), [false, true]);
});
