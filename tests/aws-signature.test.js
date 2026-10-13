import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { canonicalRequest, sign, presign, signingKey } from '../server/aws-signature.js';

// AWS publishes this request and its expected signature, so a mistake anywhere
// in the chain shows up here rather than as a rejected upload against R2.
const KEY = 'AKIAIOSFODNN7EXAMPLE';
const SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
const DATE = new Date('2013-05-24T00:00:00Z');

test('the documented GET Object request produces the signature AWS publishes', () => {
  const headers = {
    Host: 'examplebucket.s3.amazonaws.com',
    Range: 'bytes=0-9',
    'x-amz-content-sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'x-amz-date': '20130524T000000Z',
  };
  const canonical = canonicalRequest({
    method: 'GET', path: '/test.txt', query: {}, headers,
    payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  });
  assert.equal(createHash('sha256').update(canonical.value).digest('hex'),
    '7344ae5b7ee6c3e7e6b0fe0640412a37625d1fbfff95c48bbb2dc43964946972');

  const signed = sign({
    method: 'GET', path: '/test.txt', query: {}, headers,
    payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    secret: SECRET, accessKeyId: KEY, region: 'us-east-1', service: 's3', date: DATE,
  });
  assert.equal(signed.signature, 'f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
  assert.equal(signed.signedHeaders, 'host;range;x-amz-content-sha256;x-amz-date');
});

test('a presigned link carries its own authorization and cannot be extended', () => {
  const url = presign({
    url: 'https://account.r2.cloudflarestorage.com/viana-storage/models/pack.rar',
    expires: 300, secret: SECRET, accessKeyId: KEY, region: 'auto', service: 's3', date: DATE,
  });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('X-Amz-Expires'), '300');
  assert.equal(parsed.searchParams.get('X-Amz-Algorithm'), 'AWS4-HMAC-SHA256');
  assert.match(parsed.searchParams.get('X-Amz-Signature'), /^[a-f0-9]{64}$/);
  // Editing the expiry has to invalidate the link, or a short-lived link is not short-lived.
  const longer = presign({
    url: 'https://account.r2.cloudflarestorage.com/viana-storage/models/pack.rar',
    expires: 86400, secret: SECRET, accessKeyId: KEY, region: 'auto', service: 's3', date: DATE,
  });
  assert.notEqual(new URL(longer).searchParams.get('X-Amz-Signature'), parsed.searchParams.get('X-Amz-Signature'));
});

test('a key with characters needing escapes keeps its path separators', () => {
  const url = presign({
    url: 'https://account.r2.cloudflarestorage.com/viana-storage/models/a b+c(1).rar',
    expires: 60, secret: SECRET, accessKeyId: KEY, region: 'auto', service: 's3', date: DATE,
  });
  assert.match(url, /viana-storage\/models\/a%20b%2Bc%281%29\.rar\?/);
});
