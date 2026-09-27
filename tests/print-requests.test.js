import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, basename } from 'node:path';
import { createApi } from '../server/api.js';

test('print requests bind size, owner, uploaded file and approval independently', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'viana-print-test-'));
  const api = createApi({ dataDir: directory, secureCookies: false });
  const server = createServer(api.handler);
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const call = (path, cookie = '', body, type = 'application/json', source = origin) => fetch(origin + path, {
    method: body ? 'POST' : 'GET', headers: { Origin: source, Cookie: cookie, 'Content-Type': type },
    body: Buffer.isBuffer(body) ? body : body ? JSON.stringify(body) : undefined,
  });
  const cookie = response => response.headers.get('set-cookie').split(';')[0];
  try {
    await api.createUser({ name: 'Owner', email: 'owner@example.com', phone: '9000000021', password: 'Owner-password123' }, 'admin');
    const admin = cookie(await call('/api/auth/admin-login', '', { identifier: 'owner@example.com', password: 'Owner-password123' }));
    const register = (name, phone) => call('/api/auth/register', '', { name, email: `${name}@example.com`, phone, password: 'Customer-password123', confirmPassword: 'Customer-password123' });
    const alice = cookie(await register('Alice', '9000000022'));
    const bob = cookie(await register('Bob', '9000000023'));
    const spec = { designId: 'floral-branch-wall', width: 80.5, height: 40, paper: 'linen', quantity: 2 };
    assert.equal((await call('/api/print-requests', '', spec)).status, 401);
    assert.equal((await call('/api/admin/print-requests', alice)).status, 403);
    for (const bad of [{ width: 0 }, { width: '80' }, { height: 201 }, { paper: 'invalid' }, { quantity: 1.5 }, { designId: '../secret' }]) {
      assert.equal((await call('/api/print-requests', alice, { ...spec, ...bad })).status, 400);
    }
    assert.equal((await call('/api/print-requests', alice, spec, 'application/json', 'https://attacker.example')).status, 403);
    let response = await call('/api/print-requests', alice, spec);
    assert.equal(response.status, 201);
    const a = (await response.json()).request;
    assert.equal(a.width, 80.5); assert.equal(a.height, 40); assert.equal(a.paper, 'linen'); assert.equal(a.quantity, 2);
    assert.equal(a.status, 'pending'); assert.equal(a.file, undefined);
    assert.equal((await (await call('/api/print-requests', alice, spec)).json()).request.id, a.id, 'retry returns the same request');
    const a2 = (await (await call('/api/print-requests', alice, { ...spec, width: 100 })).json()).request;
    const b = (await (await call('/api/print-requests', bob, spec)).json()).request;
    assert.notEqual(a2.id, a.id); assert.notEqual(b.id, a.id);
    const aliceRequests = (await (await call('/api/print-requests', alice)).json()).requests;
    assert.deepEqual(new Set(aliceRequests.map(r => r.id)), new Set([a.id, a2.id]));
    assert.equal((await (await call('/api/admin/print-requests', admin)).json()).requests.length, 3);
    const download = id => `/api/print-requests/${id}/download`;
    const file = id => `/api/admin/print-requests/${id}/file`;
    const decision = id => `/api/admin/print-requests/${id}/decision`;
    assert.equal((await call(download(a.id), alice)).status, 403);
    assert.equal((await call(download(a.id), bob)).status, 404);
    assert.equal((await call(decision(a.id), admin, { action: 'approve', confirmed: true })).status, 409);
    const pdf = Buffer.from('%PDF-1.4\n% print file for Alice, 80.5 x 40 inches\n%%EOF');
    const revised = Buffer.from('%PDF-1.4\n% revised print file for Alice, 80.5 x 40 inches\n%%EOF');
    assert.equal((await call(file(a.id), bob, pdf, 'application/pdf')).status, 403);
    assert.equal((await call(file(a.id), admin, pdf, 'image/png')).status, 415);
    assert.equal((await readdir(api.filesRoot)).length, 0, 'failed uploads leave no private files');
    response = await call(file(a.id), admin, pdf, 'application/pdf');
    assert.equal(response.status, 201);
    const firstFile = (await response.json()).request;
    assert.equal(firstFile.file_ready, true); assert.equal(firstFile.file, undefined);
    assert.equal((await call(download(a.id), alice)).status, 403, 'upload is not approval');
    assert.deepEqual(Buffer.from(await (await call(download(a.id), admin)).arrayBuffer()), pdf, 'owner can inspect pending file');
    assert.equal((await call(decision(a.id), admin, { action: 'approve', fileVersion: firstFile.file_version })).status, 409, 'print confirmation is required');
    const latest = (await (await call(file(a.id), admin, revised, 'application/pdf')).json()).request;
    assert.equal((await readdir(api.filesRoot)).length, 1, 'replaced pending file is removed');
    assert.equal((await call(decision(a.id), admin, { action: 'approve', confirmed: true, fileVersion: firstFile.file_version })).status, 409, 'stale file approval is refused');
    assert.equal((await call(decision(a.id), admin, { action: 'approve', confirmed: true, fileVersion: latest.file_version })).status, 200);
    response = await call(download(a.id), alice);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-disposition'), /80.5x40in.pdf/);
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), revised);
    assert.equal((await call(download(a2.id), alice)).status, 403, 'another size stays locked');
    assert.equal((await call(download(b.id), bob)).status, 403, 'another customer stays locked');
    assert.equal((await call(file(a.id), admin, pdf, 'application/pdf')).status, 409, 'approved file cannot silently change');
    assert.equal((await call(decision(b.id), admin, { action: 'decline' })).status, 200);
    assert.equal((await call(download(b.id), bob)).status, 403);
    assert.equal((await call(decision(a.id), admin, { action: 'revoke' })).status, 200);
    assert.equal((await call(download(a.id), alice)).status, 403);
    const second = createApi({ dataDir: directory, secureCookies: false });
    assert.equal(second.db.prepare('SELECT status FROM print_requests WHERE id=?').get(a.id).status, 'revoked');
    assert.equal(second.db.prepare('SELECT width FROM print_requests WHERE id=?').get(a2.id).width, 100);
    second.close();
  } finally {
    await new Promise(done => server.close(done)); api.close();
    assert.equal(dirname(directory), resolve(tmpdir())); assert.ok(basename(directory).startsWith('viana-print-test-'));
    await rm(directory, { recursive: true, force: true });
  }
});
