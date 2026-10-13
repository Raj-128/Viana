import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createR2Store, createFileStore, createLocalStore } from '../server/file-store.js';

const CONFIG = { accountId: 'acct123', bucket: 'viana-storage', accessKeyId: 'KEY', secretAccessKey: 'SECRET' };
const record = () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, ...init });
    if (init.method === 'HEAD') return new Response(null, { status: 200, headers: { 'content-length': '42' } });
    if (init.method === 'GET') return new Response('bytes', { status: 200, headers: { 'content-length': '5' } });
    return new Response(null, { status: 200 });
  };
  return { calls, store: createR2Store({ ...CONFIG, fetcher }) };
};

test('an upload is signed, addressed to the bucket and never guesses the account', async () => {
  const { calls, store } = record();
  await store.put('models/pack.rar', Buffer.from('data'), { contentType: 'application/vnd.rar' });
  const put = calls.find(call => call.method === 'PUT');
  assert.equal(put.url, 'https://acct123.r2.cloudflarestorage.com/viana-storage/models/pack.rar');
  assert.match(put.headers.Authorization, /^AWS4-HMAC-SHA256 Credential=KEY\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=[a-z0-9;-]+, Signature=[a-f0-9]{64}$/);
  assert.equal(put.headers['content-type'], 'application/vnd.rar');
  assert.match(put.headers['x-amz-date'], /^\d{8}T\d{6}Z$/);
});

test('a large package streams instead of being held in memory', async () => {
  const { calls, store } = record();
  await store.put('models/big.rar', Readable.from([Buffer.from('a'), Buffer.from('b')]), { size: 2 });
  const put = calls.find(call => call.method === 'PUT');
  assert.equal(put.duplex, 'half', 'a stream body must not be buffered');
  assert.equal(put.headers['content-length'], '2');
  // A stream cannot be hashed before it is sent, so it is excluded by name.
  assert.equal(put.headers['x-amz-content-sha256'], 'UNSIGNED-PAYLOAD');
});

test('a missing object reads as absent rather than as a failure', async () => {
  const store = createR2Store({ ...CONFIG, fetcher: async () => new Response(null, { status: 404 }) });
  assert.equal(await store.stat('models/gone.rar'), null);
  assert.equal(await store.read('models/gone.rar'), null);
  await store.remove('models/gone.rar'); // deleting what is already gone is not an error
});

test('storage trouble is reported as storage trouble, not as a missing file', async () => {
  const store = createR2Store({ ...CONFIG, fetcher: async () => new Response('denied', { status: 403 }) });
  await assert.rejects(store.stat('models/pack.rar'), error => error.status === 502);
});

test('a download link carries the customer filename and expires', async () => {
  const { store } = record();
  const url = new URL(await store.downloadUrl('models/pack.rar', { filename: 'Pendant Light.rar', expires: 120 }));
  assert.equal(url.host, 'acct123.r2.cloudflarestorage.com');
  assert.equal(url.searchParams.get('X-Amz-Expires'), '120');
  assert.equal(url.searchParams.get('response-content-disposition'), 'attachment; filename="Pendant Light.rar"');
  assert.match(url.searchParams.get('X-Amz-Signature'), /^[a-f0-9]{64}$/);
});

test('a name that climbs out of the bucket prefix is refused by both stores', async () => {
  const { store } = record();
  for (const name of ['../studio.sqlite', '/etc/passwd', 'models/../../secret', '.private/key']) {
    await assert.rejects(store.put(name, Buffer.from('x')), /Invalid file name/, name);
    await assert.rejects(createLocalStore('/tmp/anything').put(name, Buffer.from('x')), /Invalid file name/, name);
  }
});

test('R2 is used only when every credential is present', () => {
  assert.equal(createFileStore('/tmp/files', {}).kind, 'local');
  assert.equal(createFileStore('/tmp/files', { R2_BUCKET: 'b', R2_ACCOUNT_ID: 'a' }).kind, 'local', 'half a configuration is not a configuration');
  assert.equal(createFileStore('/tmp/files', {
    R2_BUCKET: 'b', R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'k', R2_SECRET_ACCESS_KEY: 's',
  }).kind, 'r2');
});
