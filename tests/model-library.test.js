import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { importModelLibrary, readJson } from '../server/model-library.js';
import { pairingKey, classifyModel, archiveTitle } from '../server/model-classification.js';
import { selectRecentModels } from '../src/js/hero-designs.js';

test('numbered preview variations pair, and actual objects override folder names', () => {
  assert.equal(pairingKey('DESIGN -2  IMAGE.jpg'), pairingKey('DESIGN-2'));
  assert.equal(pairingKey('DESIGN -12 IMAGE.jpg'), pairingKey('DESIGN -12  IMAGE'));
  assert.equal(pairingKey('DESIGN-1.jpg'), pairingKey('DESIGN-1.zip'));
  assert.equal(archiveTitle(['Pro 3DSky - Delta Light Boxy R Spotlights/a.max'], ''), 'Delta Light Boxy R Spotlights');
  assert.equal(classifyModel('Armchair POANG By IKEA', 'concole design').itemType, 'armchair');
  assert.equal(classifyModel('Martin Masse Agatha Coffee Tables', 'SOFA DESIGN').itemType, 'coffee table');
  assert.equal(classifyModel('Modern Pendant Light', 'LIGHT DESIGN').theme, 'modern');
  assert.equal(classifyModel('Loft Pendant Light', 'LIGHT DESIGN').theme, 'urban');
  assert.equal(classifyModel('Unidentified Light', 'LIGHT DESIGN').theme, '', 'unknown styles are not invented');
});

test('import publishes complete pairs privately, is idempotent, and preserves added dates', async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'viana-library-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = resolve(root, 'incoming'), dataDir = resolve(root, '.private');
  await mkdir(source, { recursive: true });
  const photo = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#eee' } }).jpeg().toBuffer();
  await writeFile(resolve(source, 'Modern Pendant IMAGE.jpg'), photo);
  await writeFile(resolve(source, 'Modern Pendant.obj'), 'o pendant\nv 0 0 0\n');
  await writeFile(resolve(source, 'Missing IMAGE.jpg'), photo);
  const now = Date.now() + 10000;
  const options = { root, source, dataDir, now, settleMs: 0 };
  const first = await importModelLibrary(options);
  assert.equal(first.count, 1); assert.equal(first.issues.length, 1);
  const before = Object.values((await readJson(resolve(dataDir, 'model-library.json'))).records)[0];
  assert.equal(before.project.itemType, 'pendant light');
  assert.equal(before.project.sourceFiles[0].url, `/api/designs/${before.project.id}/download`);
  assert.deepEqual(before.project.sourceFiles[0].contents, ['Modern Pendant.obj']);
  assert.equal(await readFile(resolve(dataDir, 'files', before.file), 'utf8'), 'o pendant\nv 0 0 0\n');
  assert.equal((await importModelLibrary(options)).changed, false);
  await writeFile(resolve(source, 'Modern Pendant.obj'), 'o revised\nv 1 1 1\n');
  await writeFile(resolve(source, 'New Chair IMAGE.jpg'), photo);
  await writeFile(resolve(source, 'New Chair.obj'), 'o chair\nv 1 2 3\n');
  const second = await importModelLibrary({ ...options, now: now + 10000 });
  assert.equal(second.count, 2);
  const records = Object.values((await readJson(resolve(dataDir, 'model-library.json'))).records);
  assert.equal(records.find(r => r.project.id === before.project.id).project.addedAt, before.project.addedAt);
  assert.equal(selectRecentModels(records.map(r => r.project))[0].title, 'New Chair');
  assert.equal((await importModelLibrary({ ...options, source: resolve(root, 'offline') })).unavailable, true);
  assert.equal(Object.keys((await readJson(resolve(dataDir, 'model-library.json'))).records).length, 2);
});

test('recent carousel selects only real models and sorts by added time without mutating source', () => {
  const base = { workType: '3d', sourceFiles: [{}] };
  const projects = [
    { ...base, id: 'old', title: 'A', addedAt: '2026-09-01' },
    { ...base, id: 'new', title: 'B', addedAt: '2026-10-10' },
    { ...base, id: 'preview', title: 'C', sourceFiles: [], addedAt: '2026-10-11' },
    { ...base, id: 'legacy', title: 'D' },
  ];
  assert.deepEqual(selectRecentModels(projects).map(p => p.id), ['new', 'old']);
  assert.equal(projects[0].id, 'old');
});

test('reviewed packages use their real preview and reject stale source mappings', async t => {
  const { fileHash } = await import('../server/model-library.js');
  const root = await mkdtemp(resolve(tmpdir(), 'viana-reviewed-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = resolve(root, 'incoming'), dataDir = resolve(root, '.private');
  await mkdir(source, { recursive: true }); await mkdir(dataDir);
  await writeFile(resolve(source, 'Plant.obj'), 'original package');
  await sharp({ create: { width: 30, height: 20, channels: 3, background: 'red' } }).png().toFile(resolve(source, 'Plant IMAGE.png'));
  await sharp({ create: { width: 20, height: 30, channels: 3, background: 'green' } }).png().toFile(resolve(dataDir, 'actual.png'));
  await writeFile(resolve(dataDir, 'reviewed.obj'), 'o plant\nv 0 0 0\n');
  await writeFile(resolve(dataDir, 'model-prepared.json'), JSON.stringify({ 'Plant IMAGE.png': {
    sourceSha256: await fileHash(resolve(source, 'Plant.obj')), file: 'reviewed.obj', preview: 'actual.png',
  } }));
  const options = { root, source, dataDir, settleMs: 0, now: Date.now() + 10000 };
  assert.equal((await importModelLibrary(options)).count, 1);
  const before = (await readJson(resolve(dataDir, 'model-library.json'))).records['Plant IMAGE.png'];
  assert.equal(before.size, Buffer.byteLength('o plant\nv 0 0 0\n'));
  assert.equal(await readFile(resolve(dataDir, 'files', before.file), 'utf8'), 'o plant\nv 0 0 0\n');
  const dimensions = await sharp(Buffer.from(before.preview, 'base64')).metadata();
  assert.equal(dimensions.width, 20); assert.equal(dimensions.height, 30);
  assert.equal((await importModelLibrary(options)).changed, false);
  await writeFile(resolve(source, 'Plant.obj'), 'changed package content');
  const stale = await importModelLibrary(options);
  assert.match(stale.issues[0].reason, /Source changed since package review/);
  assert.equal((await readJson(resolve(dataDir, 'model-library.json'))).records['Plant IMAGE.png'].sha256, before.sha256);
});
