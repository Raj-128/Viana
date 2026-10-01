import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createApi } from '../server/api.js';
import { GOOGLE_CLIENT_ID, verifyGoogleToken } from '../server/google-auth.js';

test('Google rejects malformed tokens using the official verifier', async () => {
  await assert.rejects(verifyGoogleToken('not-a-jwt', GOOGLE_CLIENT_ID));
});

test('Google HTTP sign-in needs no phone, verifies claims, links with password and never grants admin/download access', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'viana-google-'));
  let claims;
  const api = createApi({ dataDir: directory, secureCookies: false, googleVerifier: async (credential, audience) => {
    assert.equal(audience, GOOGLE_CLIENT_ID);
    if (credential === 'invalid') throw new Error('Invalid signature');
    return claims;
  } });
  const server = createServer(api.handler);
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const call = (path, body, token, source = origin) => fetch(origin + '/api/' + path, { method: body ? 'POST' : 'GET', headers: {
    Origin: source, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }, body: body ? JSON.stringify(body) : undefined });
  const challenge = async (subject = 'google-1', email = 'google@example.com') => {
    const config = await (await call('auth/google/config')).json();
    assert.equal(config.clientId, GOOGLE_CLIENT_ID);
    claims = { sub: subject, email, email_verified: true, aud: GOOGLE_CLIENT_ID, iss: 'https://accounts.google.com', exp: Math.floor(Date.now()/1000)+3600, nonce: config.nonce, name: 'Google Customer' };
    return { nonce: config.nonce, credential: 'signed-test-token' };
  };
  try {
    let body = await challenge();
    assert.equal((await call('auth/google', { ...body, credential: 'invalid' })).status, 401);
    for (const [field, bad] of [['aud', 'attacker'], ['iss', 'https://attacker.example'], ['exp', 1], ['nonce', 'different'], ['email_verified', false]]) {
      const saved = claims[field]; claims[field] = bad;
      assert.equal((await call('auth/google', body)).status, 401, field); claims[field] = saved;
    }
    assert.equal((await call('auth/google', body, null, 'https://attacker.example')).status, 403);
    let response = await call('auth/google', { ...body, role: 'admin' });
    assert.equal(response.status, 200);
    const first = await response.json();
    assert.equal(first.user.role, 'user'); assert.equal(first.user.phone, null);
    assert.equal(first.requiresPhone, undefined);
    assert.ok(response.headers.get('set-cookie'));
    assert.equal((await call('auth/google', { ...body, phone: '9000000071' })).status, 401, 'nonce replay');
    assert.equal((await call('admin/print-requests', null, first.token)).status, 403);
    assert.equal((await call('designs/example/download', null, first.token)).status, 403);
    body = await challenge();
    response = await call('auth/google', body);
    const returning = await response.json();
    assert.equal(returning.user.id, first.user.id, 'stable Google subject');
    assert.equal(returning.user.phone, first.user.phone, 'returning users reuse their saved phone without a prompt');
    assert.equal(returning.requiresPhone, undefined);
    const session = await (await call('auth/session', null, returning.token)).json();
    assert.equal(session.user.phone, first.user.phone, 'the authenticated session includes the saved phone');
    const owner = await api.createUser({ name:'Owner',email:'owner@example.com',phone:'9000000072',password:'Owner-password123' }, 'admin');
    body = await challenge('google-owner', owner.email);
    assert.equal((await call('auth/google', body)).status, 403);
    const existing = await api.createUser({ name:'Existing',email:'existing@example.com',phone:'9000000073',password:'Existing-password123' });
    body = await challenge('google-existing', existing.email);
    assert.deepEqual(await (await call('auth/google', body)).json(), { requiresPassword: true });
    assert.equal((await call('auth/google', { ...body,password:'wrong' })).status, 401);
    response = await call('auth/google', { ...body,password:'Existing-password123' });
    assert.equal(response.status, 200);
    const linked = await response.json();
    assert.equal(linked.user.id, existing.id);
    assert.equal(linked.user.phone, existing.phone, 'linking Google preserves the phone registered with this email');
    body = await challenge('google-existing', existing.email);
    response = await call('auth/google', { ...body, phone: '9000000099' });
    const nextLogin = await response.json();
    assert.equal(nextLogin.user.phone, existing.phone, 'sign-in cannot overwrite the saved phone');
    assert.equal(nextLogin.requiresPhone, undefined);
    assert.equal(api.db.prepare('SELECT phone FROM users WHERE id=?').get(existing.id).phone, existing.phone);
    assert.equal(api.db.prepare('SELECT count(*) AS n FROM users').get().n, 3);
    body = await challenge('google-second', 'second@example.com');
    response = await call('auth/google', body);
    assert.equal(response.status, 200, 'multiple Google accounts may have no phone');
    assert.equal((await response.json()).user.phone, null);
  } finally { await new Promise(done => server.close(done)); api.close(); await rm(directory,{recursive:true,force:true}); }
});

test('existing databases migrate optional phones while preserving accounts and relationships', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'viana-phone-migration-'));
  const legacy = new DatabaseSync(resolve(directory, 'studio.sqlite'));
  legacy.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT UNIQUE NOT NULL, role TEXT NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL);
    INSERT INTO users VALUES ('existing','Customer','existing@example.com','919000000073','user','salt','hash');
    CREATE TABLE google_identities (subject TEXT PRIMARY KEY, user_id TEXT UNIQUE NOT NULL REFERENCES users(id));
    INSERT INTO google_identities VALUES ('subject','existing');
    CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    INSERT INTO sessions VALUES ('token','existing',9999999999999);`);
  legacy.close();
  let api;
  try {
    api = createApi({ dataDir: directory, secureCookies: false });
    assert.equal(api.db.prepare('SELECT phone FROM users WHERE id=?').get('existing').phone, '919000000073');
    assert.equal(api.db.prepare('SELECT user_id FROM google_identities').get().user_id, 'existing');
    assert.equal(api.db.prepare('SELECT user_id FROM sessions').get().user_id, 'existing');
    assert.equal(api.db.prepare('PRAGMA table_info(users)').all().find(column => column.name === 'phone').notnull, 0);
    assert.deepEqual(api.db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(api.db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
    api.db.exec("INSERT INTO users VALUES ('new','New','new@example.com',NULL,'user','salt','!google-only')");
    assert.throws(() => api.db.exec("INSERT INTO users VALUES ('duplicate','Duplicate','duplicate@example.com','919000000073','user','salt','hash')"));
    api.close(); api = createApi({ dataDir: directory, secureCookies: false });
    assert.equal(api.db.prepare('SELECT count(*) AS n FROM users').get().n, 2);
  } finally { api?.close(); await rm(directory, {recursive:true, force:true}); }
});
