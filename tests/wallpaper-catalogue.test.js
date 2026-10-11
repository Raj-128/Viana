import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rename, rm, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { createServer } from 'vite';
import { generateWallpaperCatalogue, wallpaperCataloguePlugin } from '../server/wallpaper-catalogue.js';

const image = () => sharp({ create: { width: 1200, height: 800, channels: 3, background: '#886644' } }).png().toBuffer();
test('encoding migration regenerates from originals once and keeps IDs and source bytes', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'viana-preview-profile-'));
  try {
    const folder = resolve(root, 'src/assets/images/wallpapers/library/Studio');
    await mkdir(folder, { recursive: true });
    const source = await image();
    const original = resolve(folder, 'Sample.png');
    await writeFile(original, source);
    await generateWallpaperCatalogue(root);
    const moduleFile = resolve(root, 'src/generated/wallpaper-catalogue.js');
    const catalogue = await readFile(moduleFile, 'utf8');
    const cacheFile = resolve(root, '.private/wallpaper-catalogue-cache.json');
    const cache = JSON.parse(await readFile(cacheFile, 'utf8'));
    for (const entry of Object.values(cache)) delete entry.previewProfile;
    await writeFile(cacheFile, JSON.stringify(cache));
    const filename = (await readdir(resolve(root, 'src/generated/wallpaper-previews')))[0];
    const preview = resolve(root, 'src/generated/wallpaper-previews', filename);
    // Simulate a preview from the previous encoder; migration must replace it.
    await writeFile(preview, await sharp(source).resize(12, 8).jpeg().toBuffer());
    await generateWallpaperCatalogue(root);
    assert.equal((await sharp(preview).metadata()).width, 1000);
    assert.equal(await readFile(moduleFile, 'utf8'), catalogue);
    assert.deepEqual(await readFile(original), source);
    const encoded = await readFile(preview);
    const modified = (await stat(preview)).mtimeMs;
    await generateWallpaperCatalogue(root);
    assert.deepEqual(await readFile(preview), encoded);
    assert.equal((await stat(preview)).mtimeMs, modified, 'cached builds do not re-encode');
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('a fresh checkout preserves its public snapshot without private source files', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'viana-snapshot-'));
  try {
    await mkdir(resolve(root, 'src/generated'), { recursive: true });
    const file = resolve(root, 'src/generated/wallpaper-catalogue.js');
    const snapshot = 'export default [{cover:image0}];';
    await writeFile(file, snapshot);
    const modelFolder = resolve(root, 'src/assets/images/3D FILE/fbx obj');
    await mkdir(modelFolder, { recursive: true });
    await writeFile(resolve(modelFolder, 'bathroom-preview.png'), await image());
    // A tracked model reference image must not replace the wallpaper snapshot
    // when CI builds a checkout without the private wallpaper library.
    const cleanModels = resolve(root, 'src/assets/images/clean-model-previews');
    await mkdir(cleanModels, { recursive: true });
    await writeFile(resolve(cleanModels, 'bathroom-accessories-1.png'), await image());
    const result = await generateWallpaperCatalogue(root);
    assert.equal(result.snapshot, true);
    assert.equal(await readFile(file, 'utf8'), snapshot);
    assert.equal((await generateWallpaperCatalogue(root)).snapshot, true);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('Rimura views group into one product gallery and AVIF/WebP are supported', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'viana-variants-'));
  try {
    const folder = resolve(root, 'src/assets/images/wallpapers/library/Rimura Tailor/floral design');
    await mkdir(folder, { recursive: true });
    await writeFile(resolve(folder, 'ADORNA-Rimura-634296-relabc.avif'),
      await sharp({ create: { width: 32, height: 32, channels: 3, background: '#aabbcc' } }).avif().toBuffer());
    await writeFile(resolve(folder, 'ADORNA-Rimura-634296-reldef.webp'),
      await sharp({ create: { width: 32, height: 32, channels: 3, background: '#445566' } }).webp().toBuffer());
    const result = await generateWallpaperCatalogue(root);
    assert.equal(result.count, 1);
    assert.equal(result.images, 2);
    assert.equal(result.errors.length, 0);
    const code = await readFile(resolve(root, 'src/generated/wallpaper-catalogue.js'), 'utf8');
    assert.match(code, /Rimura Tailor — Adorna/);
    assert.match(code, /gallery:\[image0,image1\]/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('nested collections import once, resize/watermark, retain IDs on rename and remove deleted designs', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'viana-catalogue-'));
  try {
    const folder = resolve(root, 'src/assets/images/wallpapers/library/New Brand/Kids');
    await mkdir(folder, { recursive: true });
    const source = await image();
    await writeFile(resolve(folder, 'Moon.png'), source);
    // Model previews must never become wallpaper products, even with a
    // wallpaper library present (the snapshot-only case is separate).
    const modelFolder = resolve(root, 'src/assets/images/clean-model-previews');
    await mkdir(modelFolder, { recursive: true });
    await writeFile(resolve(modelFolder, 'Model-only.png'), await sharp({ create: { width: 24, height: 24, channels: 3, background: '#123456' } }).png().toBuffer());
    await writeFile(resolve(folder, 'Moon-copy.png'), source);
    await writeFile(resolve(folder, 'not-an-image.jpg'), 'invalid image');
    await writeFile(resolve(folder, 'private.psd'), 'not public');
    const first = await generateWallpaperCatalogue(root, () => {});
    assert.equal(first.count, 1);
    assert.equal(first.duplicates, 1);
    assert.equal(first.errors.length, 1);
    const moduleFile = resolve(root, 'src/generated/wallpaper-catalogue.js');
    const code = await readFile(moduleFile, 'utf8');
    assert.match(code, /"collection":"New Brand"/);
    assert.match(code, /"theme":"child"/);
    assert.doesNotMatch(code, /private\.psd|wallpapers\/library/);
    assert.doesNotMatch(code, /Clean Model Previews|Model Only/);
    const id = code.match(/local-[a-f0-9]+/)[0];
    const previewFile = (await readdir(resolve(root, 'src/generated/wallpaper-previews')))[0];
    const preview = sharp(resolve(root, 'src/generated/wallpaper-previews', previewFile));
    assert.equal((await preview.metadata()).width, 1000);
    assert.equal((await preview.metadata()).isProgressive, true);
    const { channels } = await preview.stats();
    assert.ok(channels.some(channel => channel.stdev > 5), 'watermark changes a solid-color image');
    const heroFile = (await readdir(resolve(root, 'src/generated/hero-previews')))[0];
    const cleanHero = sharp(resolve(root, 'src/generated/hero-previews', heroFile));
    assert.equal((await cleanHero.metadata()).width, 640);
    assert.equal((await cleanHero.metadata()).isProgressive, true);
    const heroStats = await cleanHero.stats();
    assert.ok(heroStats.channels.every(channel => channel.stdev < 1), 'hero thumbnail has no added watermark');
    assert.match(code, /thumbnail:hero0,heroCover:hero0,cover:image0/);
    await rm(resolve(folder, 'Moon-copy.png'));
    await rename(resolve(folder, 'Moon.png'), resolve(folder, 'Renamed.png'));
    await generateWallpaperCatalogue(root, () => {});
    assert.ok((await readFile(moduleFile, 'utf8')).includes(id));
    await rm(resolve(folder, 'Renamed.png'));
    assert.equal((await generateWallpaperCatalogue(root, () => {})).count, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('local watcher discovers a new folder and serves previews while denying originals', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'viana-watch-'));
  let server;
  try {
    await mkdir(resolve(root, 'src/assets/images'), { recursive: true });
    server = await createServer({ configFile: false, root, logLevel: 'silent', plugins: [wallpaperCataloguePlugin()],
      server: { host: '127.0.0.1', port: 0, watch: { awaitWriteFinish: { stabilityThreshold: 150 } } } });
    await server.listen();
    const url = `http://127.0.0.1:${server.httpServer.address().port}`;
    const folder = resolve(root, 'src/assets/images/New Collection/Floral');
    await mkdir(folder, { recursive: true });
    await writeFile(resolve(folder, 'New Flower.webp'), await sharp(await image()).webp().toBuffer());
    const moduleFile = resolve(root, 'src/generated/wallpaper-catalogue.js');
    let code = '';
    for (let attempt = 0; attempt < 60; attempt++) {
      code = await readFile(moduleFile, 'utf8');
      if (code.includes('New Flower')) break;
      await new Promise(done => setTimeout(done, 200));
    }
    assert.match(code, /New Flower/);
    assert.equal((await fetch(`${url}/src/assets/images/New%20Collection/Floral/New%20Flower.webp`)).status, 403);
    assert.equal((await fetch(`${url}/SRC/ASSETS/IMAGES/New%20Collection/Floral/New%20Flower.webp`)).status, 403);
    assert.equal((await fetch(`${url}/src/assets/images/wallpapers/previews/..%2f..%2fNew%20Collection/Floral/New%20Flower.webp`)).status, 403);
    const preview = code.match(/wallpaper-previews\/[a-f0-9]+\.jpg/)[0];
    assert.equal((await fetch(`${url}/src/generated/${preview}`)).status, 200);
    await rm(resolve(folder, 'New Flower.webp'));
    for (let attempt = 0; attempt < 60; attempt++) {
      code = await readFile(moduleFile, 'utf8');
      if (!code.includes('New Flower')) break;
      await new Promise(done => setTimeout(done, 200));
    }
    assert.doesNotMatch(code, /New Flower/);
  } finally { await server?.close(); await rm(root, { recursive: true, force: true }); }
});
