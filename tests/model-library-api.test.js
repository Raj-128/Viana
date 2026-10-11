import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { createModelLibraryApi } from '../server/model-library-api.js';
import { syncModelLibrary } from '../scripts/sync-model-library.js';

test('live sync authenticates uploads, verifies checksums, publishes safely and resumes without reupload', async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'viana-sync-'));
  const dataDir = resolve(root, 'remote'), filesRoot = resolve(dataDir, 'files');
  await mkdir(filesRoot, { recursive: true });
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE designs(id TEXT PRIMARY KEY,file TEXT); CREATE TABLE model_tiers(design_id TEXT PRIMARY KEY,tier INTEGER); CREATE TABLE model_archive_formats(design_id TEXT,format TEXT,PRIMARY KEY(design_id,format));');
  const token = 'test-model-sync-token-01234567890123456789';
  const handler = createModelLibraryApi({ dataDir, filesRoot, db, syncToken: token,
    json: (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); },
    fail: (status, message) => Object.assign(new Error(message), { status }),
  });
  const server = createServer(async (req, res) => {
    try { if (!await handler(req, res, new URL(req.url, 'http://local').pathname)) { res.writeHead(404); res.end(); } }
    catch (error) { res.writeHead(error.status || 500); res.end(error.message); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); await rm(root, { recursive: true, force: true }); });
  const remote = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(remote + '/api/library-sync')).status, 401);
  const headers = { Authorization: `Bearer ${token}` };
  const id = 'model-0123456789abcdef01234567', body = 'o chair\nv 1 2 3\n';
  const sha256 = createHash('sha256').update(body).digest('hex');
  const path = `/api/library-sync/${id}/file?sha256=${sha256}&type=obj`;
  assert.equal((await fetch(remote + path, { method: 'POST', headers, body: 'corrupt' })).status, 400);
  assert.equal(db.prepare('SELECT count(*) n FROM designs').get().n, 0);
  const local = resolve(root, 'local'); await mkdir(resolve(local, 'files'), { recursive: true });
  const file = `${id}-${sha256.slice(0,16)}.obj`;
  await writeFile(resolve(local, 'files', file), body);
  const preview = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#aaa' } }).webp().toBuffer();
  const record = { file, sha256, signature: sha256, size: Buffer.byteLength(body), preview: preview.toString('base64'), project: {
    id, title: 'Modern Chair', collection: 'interior', category: 'furniture', itemType: 'chair', theme: 'modern', formats: ['obj'], addedAt: '2026-10-10T10:00:00Z', summary: 'A chair.', mediumLabel: 'OBJ', sourceFiles: [{ contents: ['Modern Chair.obj'] }],
  } };
  assert.equal((await fetch(remote + `/api/library-sync/${id}/publish`, { method: 'POST', headers, body: JSON.stringify(record) })).status, 409);
  await writeFile(resolve(local, 'model-library.json'), JSON.stringify({ records: { chair: record } }));
  assert.equal((await syncModelLibrary({ dataDir: local, remote, token })).uploaded, 1);
  assert.equal((await syncModelLibrary({ dataDir: local, remote, token })).uploaded, 0);
  const catalogue = await (await fetch(remote + '/api/model-catalogue')).json();
  assert.equal(catalogue.projects[0].title, 'Modern Chair');
  assert.equal(catalogue.projects[0].sourceFiles[0].url, `/api/designs/${id}/download`);
  assert.deepEqual(catalogue.projects[0].sourceFiles[0].contents, ['Modern Chair.obj']);
  assert.equal(JSON.stringify(catalogue).includes(filesRoot), false);
  assert.equal(JSON.stringify(catalogue).includes(sha256), false);
  assert.equal((await fetch(remote + '/api/model-catalogue?revision=' + catalogue.revision)).status, 204);
  assert.equal(db.prepare('SELECT tier FROM model_tiers WHERE design_id=?').get(id).tier, 0);
  assert.equal(db.prepare('SELECT format FROM model_archive_formats WHERE design_id=?').get(id).format, 'obj');
});
