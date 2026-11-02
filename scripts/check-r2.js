// Checks an R2 token against a bucket, one operation at a time, so a refused
// request names which permission or value is wrong instead of failing as one
// opaque "Access Denied" during a deploy.
//
//   node scripts/check-r2.js
//
// Reads R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY from
// the environment. Nothing is written to disk and no credential is printed.
import { sign, hashPayload } from '../server/aws-signature.js';

const need = ['R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
const missing = need.filter(name => !process.env[name]);
if (missing.length) {
  console.error('Missing:', missing.join(', '));
  console.error('\nSet them for this command only, for example:');
  console.error('  $env:R2_ACCOUNT_ID="..."; $env:R2_BUCKET="..."; node scripts/check-r2.js');
  process.exit(1);
}

const accountId = process.env.R2_ACCOUNT_ID.trim();
const bucket = process.env.R2_BUCKET.trim();
const accessKeyId = process.env.R2_ACCESS_KEY_ID.trim();
const secret = process.env.R2_SECRET_ACCESS_KEY.trim();
const host = `${accountId}.r2.cloudflarestorage.com`;

async function call(method, path, { query = {}, body } = {}) {
  const date = new Date();
  const stamp = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const payloadHash = hashPayload(body);
  const headers = { host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': stamp };
  const { authorization } = sign({ method, path, query, headers, payloadHash,
    secret, accessKeyId, region: 'auto', service: 's3', date });
  const search = Object.keys(query).length
    ? '?' + Object.entries(query).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : '';
  const response = await fetch(`https://${host}${path}${search}`, {
    method, headers: { ...headers, Authorization: authorization }, body,
  });
  return { status: response.status, text: await response.text().catch(() => '') };
}

const probe = `__viana-check-${Date.now()}.txt`;
const checks = [
  ['reach the bucket            ', () => call('HEAD', `/${bucket}`)],
  ['list objects (Litestream)   ', () => call('GET', `/${bucket}`, { 'list-type': '2', 'max-keys': '1' })],
  ['write an object             ', () => call('PUT', `/${bucket}/${probe}`, { body: 'viana-check' })],
  ['read it back                ', () => call('GET', `/${bucket}/${probe}`)],
  ['delete it                   ', () => call('DELETE', `/${bucket}/${probe}`)],
];

console.log(`account ${accountId.slice(0, 6)}…  bucket "${bucket}"  key ${accessKeyId.slice(0, 6)}…\n`);
let failed = null;
for (const [label, run] of checks) {
  try {
    const { status, text } = await run();
    const ok = status >= 200 && status < 300;
    console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${label} HTTP ${status}`);
    if (!ok && !failed) failed = { label: label.trim(), status, text };
  } catch (error) {
    console.log(`  FAIL  ${label} ${error.message}`);
    if (!failed) failed = { label: label.trim(), status: 0, text: error.message };
  }
}

if (!failed) {
  console.log('\nEvery operation succeeded. These four values are correct and the token\nhas the permissions Litestream and the file store need.');
  process.exit(0);
}

console.log(`\nFirst failure: ${failed.label} (HTTP ${failed.status})`);
const detail = failed.text.match(/<Code>([^<]+)<\/Code>/)?.[1];
if (detail) console.log(`Reported as: ${detail}`);
console.log(`
What each failure usually means:

  403 on every operation
      The token is scoped to a different bucket than R2_BUCKET, or the secret
      does not belong to this access key id. Compare R2_BUCKET against the
      bucket name in Cloudflare, character for character.

  403 only on "list objects"
      The token lacks bucket listing. Litestream has to list to find its
      previous backups. Create a token with Object Read & Write that is scoped
      to this bucket, or to all buckets.

  404 on "reach the bucket"
      R2_BUCKET names a bucket that does not exist in this account.

  Network or DNS failure
      R2_ACCOUNT_ID is wrong, so the hostname does not resolve.
`);
process.exit(1);
