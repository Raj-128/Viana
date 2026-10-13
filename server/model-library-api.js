import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { Readable } from 'node:stream';
import { readJson, atomicJson, registerModel, archiveTypeFromHead } from './model-library.js';
import { cleanText } from './model-classification.js';
import { watermarkPreview } from './preview-watermark.js';
import { createFileStore } from './file-store.js';

export function createModelLibraryApi({ dataDir, filesRoot, store = createFileStore(filesRoot), db, json, fail, syncToken = process.env.MODEL_SYNC_TOKEN }) {
  const manifestFile = resolve(dataDir, 'model-library.json');
  let pending = Promise.resolve(), cachedStamp, cached;
  const markedPreviews = new Map();
  const locked = action => { const next = pending.catch(() => {}).then(action); pending = next; return next; };
  const authorized = req => {
    const supplied = req.headers.authorization?.replace(/^Bearer /, '') || '';
    return typeof syncToken === 'string' && syncToken.length >= 32 && timingSafeEqual(createHash('sha256').update(supplied).digest(), createHash('sha256').update(syncToken).digest());
  };
  async function catalogue() {
    const info = await stat(manifestFile).catch(() => null), stamp = info && `${info.mtimeMs}:${info.size}`;
    if (cached && stamp === cachedStamp) return cached;
    const manifest = await readJson(manifestFile, { records: {} });
    const projects = [], usedPreviews = new Set();
    for (const { project, preview } of Object.values(manifest.records)) {
      const key = createHash('sha256').update(preview).digest('hex');
      usedPreviews.add(key);
      if (!markedPreviews.has(key)) markedPreviews.set(key, watermarkPreview(Buffer.from(preview, 'base64'))
        .then(buffer => buffer.toString('base64')).catch(error => { markedPreviews.delete(key); throw error; }));
      const cover = `data:image/webp;base64,${await markedPreviews.get(key)}`;
      projects.push({ ...project, cover, thumbnail: `data:image/webp;base64,${preview}`, gallery: [cover] });
    }
    for (const key of markedPreviews.keys()) if (!usedPreviews.has(key)) markedPreviews.delete(key);
    cachedStamp = stamp;
    cached = { revision: createHash('sha256').update(JSON.stringify(projects)).digest('hex'), projects };
    return cached;
  }
  return async (req, res, path) => {
    if (path === '/api/model-catalogue' && req.method === 'GET') {
      const result = await catalogue();
      if (new URL(req.url, 'http://local').searchParams.get('revision') === result.revision) { res.writeHead(204); res.end(); }
      else json(res, 200, result);
      return true;
    }
    if (!path.startsWith('/api/library-sync')) return false;
    if (!authorized(req)) throw fail(401, 'Library sync authentication required.');
    if (path === '/api/library-sync' && req.method === 'GET') {
      const manifest = await readJson(manifestFile, { records: {} });
      json(res, 200, { models: Object.values(manifest.records).map(record => ({ id: record.project.id, sha256: record.sha256, signature: record.signature })) }); return true;
    }
    const match = path.match(/^\/api\/library-sync\/(model-[a-f0-9]{24})\/(file|publish)$/);
    if (!match || req.method !== 'POST') throw fail(404, 'Sync route not found.');
    const [, id, action] = match;
    if (action === 'file') {
      const params = new URL(req.url, 'http://local').searchParams;
      const digest = params.get('sha256'), type = params.get('type');
      if (!/^[a-f0-9]{64}$/.test(digest || '') || !['rar', 'zip', 'max', 'fbx', 'obj', 'blend', 'c4d', 'stl', 'skp', 'dwg', 'dxf', 'mat', 'matlib', 'sbsar', 'uasset', 'uproject'].includes(type)) throw fail(400, 'Invalid model format or checksum.');
      const target = `${id}-${digest.slice(0, 16)}.${type}`;
      const temp = `${target}.${randomUUID()}.partial`;
      const maxSize = 2 * 1024 ** 3;
      if (Number(req.headers['content-length']) > maxSize) throw fail(413, 'Model package exceeds 2 GB.');
      let size = 0, head = Buffer.alloc(0);
      const hash = createHash('sha256');
      // Checksum and signature are taken from the bytes as they pass, so a package
      // is never read back to be judged; only a package that matches is published.
      async function* measured() {
        for await (const chunk of req) {
          size += chunk.length; if (size > maxSize) throw fail(413, 'Model package exceeds 2 GB.');
          if (head.length < 8) head = Buffer.concat([head, chunk.subarray(0, 8 - head.length)]);
          hash.update(chunk);
          yield chunk;
        }
      }
      try {
        await store.put(temp, Readable.from(measured()), { size: Number(req.headers['content-length']) || undefined });
        if (!size || hash.digest('hex') !== digest || (['rar', 'zip'].includes(type) && archiveTypeFromHead(head) !== type)) throw fail(400, 'File checksum or format did not match.');
        // The temporary name carries no source extension. Archive signatures are
        // checked above; raw formats are admitted only by the sync credential.
        await store.move(temp, target);
      } finally { await store.remove(temp).catch(() => {}); }
      json(res, 200, { uploaded: true }); return true;
    }
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > 1024 * 1024) throw fail(413, 'Model metadata too large.'); chunks.push(chunk); }
    let record;
    try { record = JSON.parse(Buffer.concat(chunks)); } catch { throw fail(400, 'Invalid metadata.'); }
    if (record.project?.id !== id || !/^[a-f0-9]{64}$/.test(record.sha256 || '') || !/^[a-f0-9]{64}$/.test(record.signature || '')) throw fail(400, 'Invalid model metadata.');
    if (!new RegExp(`^${id}-${record.sha256.slice(0, 16)}\\.(rar|zip|max|fbx|obj|blend|c4d|stl|skp|dwg|dxf|mat|matlib|sbsar|uasset|uproject)$`).test(record.file)) throw fail(400, 'Invalid private file name.');
    const info = await store.stat(record.file).catch(() => null);
    if (!info || info.size !== record.size) throw fail(409, 'Upload the complete model file first.');
    let preview;
    try { preview = await sharp(Buffer.from(record.preview, 'base64'), { limitInputPixels: 4000000 }).resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(); }
    catch { throw fail(400, 'Invalid model preview.'); }
    const type = record.file.split('.').pop();
    // The authenticated PC importer inspects archive contents with libarchive.
    // Render does not need an archive extractor; accept only known format IDs.
    const allowed = ['max', 'fbx', 'obj', 'blend', 'c4d', 'stl', 'skp', 'dwg', 'dxf', 'mat', 'matlib', 'sbsar', 'uasset', 'uproject'];
    const formats = ['rar', 'zip'].includes(type) ? [...new Set(Array.isArray(record.project.formats) ? record.project.formats.filter(value => allowed.includes(value)) : [])] : [type];
    if (!formats.length) throw fail(400, 'No verified model formats.');
    const project = { id, workType: '3d', ownership: 'curated', year: '', location: '', formats };
    for (const key of ['title', 'collection', 'category', 'itemType', 'theme', 'mediumLabel', 'summary']) project[key] = cleanText(record.project[key]);
    if (!project.title || !['interior', 'exterior'].includes(project.collection) || !Number.isFinite(Date.parse(record.project.addedAt))) throw fail(400, 'Missing catalogue details.');
    project.addedAt = record.project.addedAt;
    project.shopCategories = [project.category, project.category === 'decoration' ? 'decor' : project.category === 'interior materials' ? 'materials' : project.category];
    const contents = record.project.sourceFiles?.[0]?.contents;
    if (contents !== undefined && (!Array.isArray(contents) || contents.some(name => typeof name !== 'string' || name.length > 4096))) throw fail(400, 'Invalid package file names.');
    project.sourceFiles = [{ name: `${project.title}.${type}`, formats, ...(contents ? { contents } : {}), url: `/api/designs/${id}/download` }];
    await locked(async () => {
      const manifest = await readJson(manifestFile, { records: {} });
      manifest.records[id] = { project, file: record.file, sha256: record.sha256, signature: record.signature, size: record.size, preview: preview.toString('base64') };
      registerModel(db, project, record.file);
      await atomicJson(manifestFile, manifest);
    });
    json(res, 200, { published: true }); return true;
  };
}
