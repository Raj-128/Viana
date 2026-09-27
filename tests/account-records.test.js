import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, basename } from 'node:path';
import { createApi } from '../server/api.js';

test('persistent account records show real registration and sign-ins only to the owner', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'viana-account-test-'));
  const previous = process.env.STUDIO_DATA_DIR;
  process.env.STUDIO_DATA_DIR = directory;
  const api = createApi({ secureCookies: false });
  if (previous === undefined) delete process.env.STUDIO_DATA_DIR; else process.env.STUDIO_DATA_DIR = previous;
  const server = createServer(api.handler);
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const call = (path, cookie = '', body) => fetch(origin + path, { method: body ? 'POST' : 'GET',
    headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  try {
    assert.equal(api.filesRoot.toLowerCase(), resolve(directory, 'files').toLowerCase());
    await api.createUser({ name: 'Owner', email: 'owner@example.com', phone: '9000000031', password: 'Owner-password123' }, 'admin');
    const admin = (await call('/api/auth/admin-login', '', { identifier: 'owner@example.com', password: 'Owner-password123' })).headers.get('set-cookie').split(';')[0];
    const user = { name: 'Customer', email: 'customer@example.com', phone: '9000000032', password: 'Customer-password123', confirmPassword: 'Customer-password123' };
    const registered = await call('/api/auth/register', '', user);
    const customer = registered.headers.get('set-cookie').split(';')[0];
    assert.equal((await call('/api/admin/accounts')).status, 401);
    assert.equal((await call('/api/admin/accounts', customer)).status, 403);
    assert.equal((await call('/api/auth/login', '', { identifier: user.email, password: 'Wrong-password123' })).status, 401);
    await call('/api/auth/logout', customer, {});
    assert.equal((await call('/api/auth/login', '', { identifier: user.email, password: user.password })).status, 200);
    const records = await (await call('/api/admin/accounts?search=customer', admin)).json();
    assert.equal(records.total, 1); assert.equal(records.accounts.length, 1);
    const account = records.accounts[0];
    assert.equal(account.name, user.name); assert.equal(account.login_count, 2);
    assert.ok(account.registered_at > 0); assert.ok(account.last_login >= account.registered_at);
    assert.deepEqual(records.events.map(event => event.event), ['login', 'logout', 'login', 'registered']);
    assert.equal(account.password, undefined); assert.equal(account.salt, undefined);
    assert.doesNotMatch(JSON.stringify(records), /Customer-password|Owner-password|viana_session/);
    const second = createApi({ dataDir: directory, secureCookies: false });
    assert.equal(second.db.prepare("SELECT count(*) AS count FROM account_events WHERE event='login'").get().count, 3);
    second.close();
  } finally {
    await new Promise(done => server.close(done)); api.close();
    assert.equal(dirname(directory), resolve(tmpdir())); assert.ok(basename(directory).startsWith('viana-account-test-'));
    await rm(directory, { recursive: true, force: true });
  }
});
