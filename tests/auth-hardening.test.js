import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { scryptSync } from 'node:crypto';
import { createApi } from '../server/api.js';
import { totpCode, verifyTotp } from '../server/totp.js';
import { createMfaVault } from '../server/mfa-vault.js';

// RFC 6238 SHA-1 vectors, truncated to the six digits used by authenticator apps.
const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
test('TOTP matches RFC vectors and rejects replay, invalid and expired codes', () => {
  for (const [seconds, expected] of [[59, '287082'], [1111111109, '081804'], [1111111111, '050471'], [1234567890, '005924'], [2000000000, '279037']]) {
    const counter = Math.floor(seconds / 30);
    assert.equal(totpCode(secret, counter), expected);
    assert.equal(verifyTotp(secret, expected, -1, seconds * 1000), counter);
    assert.equal(verifyTotp(secret, expected, counter, seconds * 1000), null);
  }
  assert.equal(verifyTotp(secret, '287082', -1, 150000), null);
  assert.equal(verifyTotp(secret, '12345', -1, 59000), null);
});

test('HTTP authentication enforces MFA, cooldown, idle expiry, cookie flags and exact origins', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'viana-auth-hardening-'));
  let api = createApi({ dataDir: directory, secureCookies: true });
  const server = createServer((req, res) => api.handler(req, res));
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const call = (path, body, token, extra = {}) => fetch(origin + path, {
    method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Origin: origin,
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }, body: body ? JSON.stringify(body) : undefined,
  });
  try {
    const owner = await api.createUser({ name: 'Owner', email: 'owner@example.com', phone: '9000000055', password: 'Owner-password123' }, 'admin');
    const credentials = { identifier: owner.email, password: 'Owner-password123' };
    let response = await call('/api/auth/admin-login', credentials);
    assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict;.*Secure/);
    assert.doesNotMatch(response.headers.get('set-cookie'), /Domain=/);
    const oldToken = (await response.json()).token;
    assert.throws(() => api.setAdminMfa(owner.email, secret, 'not-valid'), /did not match/);
    api.setAdminMfa(owner.email, secret, totpCode(secret, Math.floor(Date.now() / 30000)));
    assert.equal((await (await call('/api/auth/session', null, oldToken)).json()).user, null);
    const stored = api.db.prepare('SELECT secret FROM admin_mfa WHERE user_id=?').get(owner.id).secret;
    assert.notEqual(stored, secret);
    assert.equal(createMfaVault(directory).open(stored, owner.id), secret);
    assert.throws(() => createMfaVault(directory).open(stored, 'different-owner'));
    assert.equal((await readFile(resolve(directory, 'mfa.key'))).length, 32);
    // Allow a fresh current code after enrollment without waiting for wall-clock time.
    api.db.prepare('UPDATE admin_mfa SET last_counter=-1').run();
    assert.equal((await call('/api/auth/admin-login', credentials)).status, 401);
    assert.equal((await call('/api/auth/login', credentials)).status, 401);
    const otp = totpCode(secret, Math.floor(Date.now() / 30000));
    response = await call('/api/auth/admin-login', { ...credentials, otp });
    assert.equal(response.status, 200);
    const token = (await response.json()).token;
    assert.equal((await call('/api/auth/admin-login', { ...credentials, otp })).status, 401);
    assert.equal((await call('/api/admin/print-requests', null, token)).status, 200);
    api.db.prepare('UPDATE sessions SET last_seen=?').run(Date.now() - 31 * 60000);
    assert.equal((await call('/api/admin/print-requests', null, token)).status, 401);
    api.setAdminMfa(owner.email, null);
    for (let i = 0; i < 5; i++) assert.equal((await call('/api/auth/admin-login', { ...credentials, password: 'wrong' })).status, 401);
    response = await call('/api/auth/login', { identifier: owner.phone, password: credentials.password });
    assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '900');
    // Cooldown persists across restarting the backend and across email/phone aliases.
    api.close(); api = createApi({ dataDir: directory, secureCookies: true });
    assert.equal((await call('/api/auth/admin-login', credentials)).status, 429);
    api.db.prepare('UPDATE limits SET expires=0').run();
    assert.equal((await call('/api/auth/admin-login', credentials)).status, 200);
    assert.equal((await call('/api/auth/admin-login', credentials, null, { Origin: 'https://attacker.github.io' })).status, 403);
    assert.equal((await call('/api/auth/admin-login', credentials, null, { Origin: 'https://raj-128.github.io' })).status, 200);
    // A pre-upgrade password remains valid and upgrades only after successful authentication.
    const salt = 'legacy-test-salt';
    api.db.prepare('UPDATE users SET salt=?,password=? WHERE id=?').run(salt, scryptSync(credentials.password, salt, 64).toString('hex'), owner.id);
    assert.equal((await call('/api/auth/admin-login', credentials)).status, 200);
    assert.match(api.db.prepare('SELECT password FROM users WHERE id=?').get(owner.id).password, /^scrypt\$16384\$8\$5\$/);
  } finally {
    await new Promise(done => server.close(done)); api.close(); await rm(directory, { recursive: true, force: true });
  }
});
