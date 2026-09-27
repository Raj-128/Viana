import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('customer inbox loads size requests and refreshes approval changes', async () => {
  const source = readFileSync(new URL('../src/js/commerce.js', import.meta.url), 'utf8');
  const refresh = source.slice(source.indexOf('async function refreshDownloadRequests()'), source.indexOf('function checkApprovalStatus()'));
  let status = 'pending';
  const context = vm.createContext({
    getPrintRequests: async () => [{ id: 'sized-request', status }],
    fetchApi: async () => ({ ok: true, json: async () => ({ requests: [], access: [] }) }),
    renderCommerce() {}, announce() {},
  });
  vm.runInContext('let printRequests = [], accessRequests = [], approvedDesigns = [], notice = "";' + refresh, context);
  await vm.runInContext('refreshDownloadRequests()', context);
  assert.equal(vm.runInContext('printRequests[0].status', context), 'pending');
  status = 'approved';
  await vm.runInContext('refreshDownloadRequests()', context);
  assert.equal(vm.runInContext('printRequests[0].status', context), 'approved');
  context.getPrintRequests = async () => { throw new Error('Server unavailable'); };
  await vm.runInContext('refreshDownloadRequests()', context);
  assert.equal(vm.runInContext('notice', context), 'Server unavailable');
});

test('admin shell is visible before authentication and search refreshes both inboxes', () => {
  const html = readFileSync(new URL('../admin-downloads.html', import.meta.url), 'utf8');
  assert.match(html, /<html[^>]*class="mode-ready"/);
  assert.match(html, /id="approval-content" hidden/);
  const source = readFileSync(new URL('../src/js/admin-downloads.js', import.meta.url), 'utf8');
  const render = source.slice(source.indexOf('function renderRequests()'), source.indexOf('function renderPrintRequests()'));
  let calls = 0;
  const host = { replaceChildren() {}, classList: { add() {}, remove() {} } };
  const context = vm.createContext({ state: { requests: [] }, requestFilter: 'pending',
    $: id => id === 'request-search' ? { value: 'customer' } : host,
    renderPrintRequests: () => calls++,
  });
  vm.runInContext(render + '; renderRequests();', context);
  assert.equal(calls, 1);
});
