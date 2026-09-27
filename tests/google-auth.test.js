import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createApi } from '../server/api.js';
import { GOOGLE_CLIENT_ID, verifyGoogleToken } from '../server/google-auth.js';

test('Google rejects malformed tokens using the official verifier', async () => {
  await assert.rejects(verifyGoogleToken('not-a-jwt', GOOGLE_CLIENT_ID));
});

test('Google HTTP sign-in verifies claims, completes phone, links with password and never grants admin/download access', async () => {
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
    let response = await call('auth/google', body);
    assert.deepEqual(await response.json(), { requiresPhone: true });
    assert.equal(response.headers.get('set-cookie'), null);
    response = await call('auth/google', { ...body, phone: '9000000071', role: 'admin' });
    assert.equal(response.status, 200);
    const first = await response.json();
    assert.equal(first.user.role, 'user'); assert.equal(first.user.phone, '919000000071');
    assert.equal((await call('auth/google', { ...body, phone: '9000000071' })).status, 401, 'nonce replay');
    assert.equal((await call('admin/print-requests', null, first.token)).status, 403);
    assert.equal((await call('designs/example/download', null, first.token)).status, 403);
    body = await challenge();
    response = await call('auth/google', body);
    assert.equal((await response.json()).user.id, first.user.id, 'stable Google subject');
    const owner = await api.createUser({ name:'Owner',email:'owner@example.com',phone:'9000000072',password:'Owner-password123' }, 'admin');
    body = await challenge('google-owner', owner.email);
    assert.equal((await call('auth/google', body)).status, 403);
    const existing = await api.createUser({ name:'Existing',email:'existing@example.com',phone:'9000000073',password:'Existing-password123' });
    body = await challenge('google-existing', existing.email);
    assert.deepEqual(await (await call('auth/google', body)).json(), { requiresPassword: true });
    assert.equal((await call('auth/google', { ...body,password:'wrong' })).status, 401);
    response = await call('auth/google', { ...body,password:'Existing-password123' });
    assert.equal(response.status, 200); assert.equal((await response.json()).user.id, existing.id);
    assert.equal(api.db.prepare('SELECT count(*) AS n FROM users').get().n, 3);
  } finally { await new Promise(done => server.close(done)); api.close(); await rm(directory,{recursive:true,force:true}); }
});
