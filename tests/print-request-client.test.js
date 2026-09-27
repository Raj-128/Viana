import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('customer client submits exact dimensions and downloads the request file, not a shared original', async () => {
  const source = readFileSync(new URL('../src/js/print-requests.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
  const calls = [], links = [];
  let approved = false;
  const request = { id: 'request-a', width: 80.5, height: 40, paper: 'linen', quantity: 2 };
  const context = {
    URL: { createObjectURL: () => 'blob:approved-print', revokeObjectURL() {} },
    setTimeout() {},
    document: { body: { append: link => links.push(link) }, createElement: () => ({ click() {}, remove() {} }) },
    fetchApi: async (path, options) => {
      calls.push({ path, options });
      if (options.method === 'POST') return { ok: true, json: async () => ({ request }) };
      if (!approved) return { ok: false, json: async () => ({ error: 'Not approved yet.' }) };
      return { ok: true, headers: { get: () => 'application/pdf' }, blob: async () => ({ size: 100 }) };
    },
    request,
  };
  vm.createContext(context); vm.runInContext(source, context);
  await vm.runInContext("createPrintRequest('wall', {width:80.5,height:40,paper:'linen',quantity:2})", context);
  assert.deepEqual(JSON.parse(calls[0].options.body), { designId: 'wall', width: 80.5, height: 40, paper: 'linen', quantity: 2 });
  assert.match(vm.runInContext('printRequestSummary(request)', context), /80.5.*40 inches.*Wall Linen/);
  await assert.rejects(vm.runInContext('downloadPrintFile(request)', context), /Not approved/);
  assert.equal(links.length, 0);
  approved = true;
  await vm.runInContext('downloadPrintFile(request)', context);
  assert.equal(calls.at(-1).path, 'api/print-requests/request-a/download');
  assert.equal(links[0].download, 'viana-request-a-80.5x40in.pdf');
});
