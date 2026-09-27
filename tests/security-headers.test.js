import test from 'node:test';
import assert from 'node:assert/strict';
import { securityHeaders, contentSecurityPolicy, applySecurityHeaders } from '../server/security-headers.js';

test('CSP blocks inline script while allowing existing fonts, animations, API and local HMR', () => {
  const headers = securityHeaders();
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  const policy = headers['Content-Security-Policy'];
  assert.match(policy, /script-src 'self' https:\/\/unpkg.com/);
  assert.doesNotMatch(policy.match(/script-src[^;]+/)[0], /unsafe-inline|unsafe-eval/);
  assert.match(policy, /fonts.googleapis.com/); assert.match(policy, /fonts.gstatic.com/);
  assert.match(policy, /https:\/\/accounts.google.com\/gsi\/client/);
  assert.match(policy, /frame-src https:\/\/accounts.google.com\/gsi\//);
  assert.match(policy, /connect-src 'self' https:/);
  assert.doesNotMatch(policy, / ws:/);
  assert.match(securityHeaders(true)['Content-Security-Policy'], / ws: wss:/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.doesNotMatch(contentSecurityPolicy({ frameAncestors: false }), /frame-ancestors/);
});

test('HTTPS gets HSTS while plain localhost does not get forced to HTTPS', () => {
  for (const encrypted of [false, true]) {
    const headers = {};
    applySecurityHeaders({ socket: { encrypted }, headers: {} }, { setHeader(name, value) { headers[name] = value; } });
    assert.equal(Boolean(headers['Strict-Transport-Security']), encrypted);
  }
});
