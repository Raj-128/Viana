import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('account list appends five on scroll, deduplicates requests and retries without skipping pages', async () => {
  const make = () => ({ value: '', children: [], handlers: {}, scrollTop: 0, clientHeight: 380, scrollHeight: 525,
    append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children = children; },
    setAttribute() {}, addEventListener(name, handler) { this.handlers[name] = handler; } });
  const elements = new Map(['account-records', 'account-records-status', 'account-search', 'account-search-form'].map(id => [id, make()]));
  let pending, calls = [];
  const context = vm.createContext({ URLSearchParams,
    document: { getElementById: id => elements.get(id), createElement: make },
    fetchApi: url => { calls.push(url); return new Promise(resolve => { pending = resolve; }); },
  });
  const code = readFileSync(new URL('../src/js/admin-accounts.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export function', 'function');
  vm.runInContext(code + '; initAccountRecords();', context);
  const finish = async (page, ok = true) => {
    pending({ ok, json: async () => ok ? { accounts: Array.from({ length: 5 }, (_, i) => ({ name: String(page * 5 + i), email: 'user@example.com', role: 'user' })), total: 15, hasNext: page < 2 } : { error: 'Offline' } });
    await new Promise(resolve => setImmediate(resolve));
  };
  const host = elements.get('account-records');
  assert.equal(calls.length, 1); await finish(0);
  assert.equal(host.children.length, 5);
  host.scrollTop = 145; host.handlers.scroll(); host.handlers.scroll();
  assert.equal(calls.length, 2); assert.match(calls[1], /page=1/);
  await finish(1, false);
  assert.equal(host.children[0].children[0].children[0].textContent, '0 - user');
  host.handlers.scroll(); assert.match(calls[2], /page=1/); await finish(1);
  assert.equal(host.children.length, 10); assert.equal(host.scrollTop, 145);
  host.scrollTop = 0; host.handlers.scroll();
  assert.equal(calls.length, 3, 'scrolling back through loaded records does not fetch');
  assert.equal(host.children[0].children[0].children[0].textContent, '0 - user');
  host.scrollTop = 145; host.handlers.scroll(); await finish(2);
  assert.equal(host.children.length, 15);
  host.handlers.scroll(); assert.equal(calls.length, 4, 'no fetch after the final page');
});
