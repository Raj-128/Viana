import { readdir, readFile, writeFile, mkdir, stat, open, copyFile, rename, rm, mkdtemp } from 'node:fs/promises';
import { resolve, relative, extname, basename, dirname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import sharp from 'sharp';
import { archiveTitle, pairingKey, classifyModel } from './model-classification.js';
import { downloadFormats } from '../src/js/download-plans.js';
import { atomicWrite } from './atomic-write.js';
import { ensureWatermarkedPreview } from './preview-watermark.js';

const exec = promisify(execFile);
const imageExtension = /\.(jpe?g|png|webp)$/i;
const supported = new Set(['max', 'fbx', 'obj', 'blend', 'c4d', 'uproject', 'uasset', 'stl', 'mat', 'matlib', 'sbsar', 'skp', 'dwg', 'dxf']);
const hash = value => createHash('sha256').update(value).digest('hex');
export const defaultModelSource = 'E:/3d design file studio viana';
export async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}
export async function atomicJson(file, value) {
  await mkdir(dirname(file), { recursive: true });
  await atomicWrite(file, JSON.stringify(value, null, 2));
}
export async function fileHash(file) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest('hex');
}
export async function modelFileType(file) {
  const handle = await open(file, 'r');
  try {
    const head = Buffer.alloc(8); await handle.read(head, 0, 8, 0);
    if (head.subarray(0, 6).equals(Buffer.from('526172211a07', 'hex'))) return 'rar';
    if (head.subarray(0, 4).equals(Buffer.from('504b0304', 'hex'))) return 'zip';
    const type = extname(file).slice(1).toLowerCase();
    if (supported.has(type)) return type;
    throw new Error('Unsupported or incomplete model file');
  } finally { await handle.close(); }
}
export async function inspectArchive(file, depth = 0) {
  const tar = process.env.MODEL_ARCHIVE_TOOL || 'tar';
  const { stdout } = await exec(tar, ['-tf', file], { timeout: 60000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  const entries = stdout.split(/\r?\n/).filter(Boolean);
  const normalized = entries.map(name => name.replaceAll('\\', '/'));
  const contents = entries.filter((name, index) => !normalized[index].endsWith('/')
    && !normalized.some(other => other.startsWith(`${normalized[index]}/`)))
    .sort((a, b) => Number(supported.has(extname(b).slice(1).toLowerCase())) - Number(supported.has(extname(a).slice(1).toLowerCase())));
  const formats = new Set(entries.map(name => extname(name).slice(1).toLowerCase()).filter(type => supported.has(type)));
  // Read nested packages through stdout into a controlled temporary file;
  // never extract archive paths onto the filesystem.
  if (depth < 2) for (const name of entries.filter(name => /\.(rar|zip)$/i.test(name))) {
    const folder = await mkdtemp(resolve(tmpdir(), 'viana-model-'));
    try {
      const { stdout: data } = await exec(tar, ['-xOf', file, '--', name], { encoding: 'buffer', timeout: 60000, maxBuffer: 256 * 1024 * 1024, windowsHide: true });
      const nested = resolve(folder, 'package'); await writeFile(nested, data);
      const result = await inspectArchive(nested, depth + 1);
      result.formats.forEach(type => formats.add(type));
      contents.push(...result.contents.map(entry => `${name}/${entry}`));
    } finally { await rm(folder, { recursive: true, force: true }); }
  }
  return { entries, contents, formats: [...formats].sort() };
}
async function walk(root) {
  const files = [];
  for (const item of (await readdir(root, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
    if (item.name.startsWith('.') || item.isSymbolicLink()) continue;
    const file = resolve(root, item.name);
    if (item.isDirectory()) files.push(...await walk(file));
    else if (item.isFile()) files.push(file);
  }
  return files;
}
export function registerModel(db, item, file) {
  db.prepare('INSERT INTO designs(id,file) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET file=excluded.file').run(item.id, file);
  db.prepare('INSERT OR IGNORE INTO model_tiers(design_id,tier) VALUES (?,0)').run(item.id);
  db.prepare('DELETE FROM model_archive_formats WHERE design_id=?').run(item.id);
  for (const format of downloadFormats.filter(format => format.extensions.some(extension => item.formats.includes(extension)))) {
    db.prepare('INSERT INTO model_archive_formats VALUES (?,?)').run(item.id, format.id);
  }
}
export function publicModel(record) { return record.project; }

export async function importModelLibrary(options = {}) {
  const root = options.root || process.cwd();
  const dataDir = options.dataDir || resolve(process.env.STUDIO_DATA_DIR || resolve(root, '.private'));
  await mkdir(dataDir, { recursive: true });
  const lock = resolve(dataDir, 'model-import.lock');
  let handle;
  try { handle = await open(lock, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const owner = Number(await readFile(lock, 'utf8').catch(() => '0'));
    let active = true;
    if (owner) { try { process.kill(owner, 0); } catch (error) { if (error.code === 'ESRCH') active = false; } }
    if (active) return { changed: false, busy: true };
    await rm(lock, { force: true });
    return importModelLibrary(options);
  }
  try { await handle.writeFile(String(process.pid)); return await runImport({ ...options, root, dataDir }); }
  finally { await handle.close(); await rm(lock, { force: true }); }
}

async function runImport({ root, source = process.env.MODEL_LIBRARY_DIR || defaultModelSource, dataDir, settleMs = 3000, now = Date.now() }) {
  const manifestFile = resolve(dataDir, 'model-library.json');
  const previous = await readJson(manifestFile, { records: {} });
  if (!await stat(source).then(info => info.isDirectory(), error => { if (error.code === 'ENOENT') return false; throw error; })) return { changed: false, unavailable: true, count: Object.keys(previous.records).length };
  const files = await walk(source), images = files.filter(file => imageExtension.test(file));
  const candidates = files.filter(file => !imageExtension.test(file) && !/\.(json|txt|pdf)$/i.test(file));
  const overrides = await readJson(resolve(root, 'server/model-library-overrides.json'), {});
  const preparedModels = await readJson(resolve(dataDir, 'model-prepared.json'), {});
  const cleanPreviews = await readJson(resolve(root, 'server/model-preview-overrides.json'), {});
  const preparedPath = name => {
    const file = resolve(dataDir, name);
    if (!file.startsWith(resolve(dataDir) + sep)) throw new Error('Prepared assets must stay in private storage.');
    return file;
  };
  const records = { ...previous.records }, issues = [], used = new Set();
  await mkdir(resolve(dataDir, 'files'), { recursive: true });
  await mkdir(resolve(root, 'src/generated/model-previews'), { recursive: true });
  const db = new DatabaseSync(resolve(dataDir, 'studio.sqlite'), { timeout: 5000 });
  db.exec('CREATE TABLE IF NOT EXISTS designs (id TEXT PRIMARY KEY,file TEXT NOT NULL); CREATE TABLE IF NOT EXISTS model_tiers (design_id TEXT PRIMARY KEY,tier INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS model_archive_formats (design_id TEXT NOT NULL,format TEXT NOT NULL,PRIMARY KEY(design_id,format));');
  let changed = false;
  try {
    for (const image of images) {
      const key = relative(source, image).split(sep).join('/');
      const matches = candidates.filter(file => dirname(file) === dirname(image) && pairingKey(basename(file)) === pairingKey(basename(image)));
      if (matches.length !== 1) { issues.push({ key, reason: matches.length ? 'Multiple matching files; rename to pair unambiguously.' : 'Matching model file missing.' }); continue; }
      const file = matches[0]; used.add(file);
      try {
        const info = await stat(file), photoInfo = await stat(image);
        if (now - Math.max(info.mtimeMs, photoInfo.mtimeMs) < settleMs) continue;
        const sidecar = await readJson(`${file}.json`, {});
        const override = { ...overrides[key], ...sidecar };
        if (override.hold) { issues.push({ key, reason: override.hold }); continue; }
        const prepared = preparedModels[key];
        const packageFile = prepared?.file ? preparedPath(prepared.file) : file;
        const cleanPreview = cleanPreviews[key];
        const previewFile = cleanPreview ? resolve(root, cleanPreview.file) : prepared?.preview ? preparedPath(prepared.preview) : image;
        if (cleanPreview && !previewFile.startsWith(resolve(root, 'src/assets/images/clean-model-previews') + sep)) throw new Error('Reviewed preview must stay in the clean preview directory.');
        const packageInfo = await stat(packageFile), previewInfo = await stat(previewFile);
        const legacySignature = hash(JSON.stringify([info.size, info.mtimeMs, photoInfo.size, photoInfo.mtimeMs, override,
          ...(prepared ? [prepared, packageInfo.size, packageInfo.mtimeMs, previewInfo.size, previewInfo.mtimeMs] : []),
          ...(cleanPreview ? [cleanPreview, previewInfo.size, previewInfo.mtimeMs] : [])]));
        const signature = hash(`${legacySignature}:archive-contents-v1`);
        const existing = previous.records[key];
        if (existing?.signature === legacySignature && await stat(resolve(dataDir, 'files', existing.file)).then(() => true, () => false)) {
          const type = extname(existing.file).slice(1).toLowerCase();
          const contents = ['rar', 'zip'].includes(type)
            ? (await inspectArchive(resolve(dataDir, 'files', existing.file))).contents : [basename(packageFile)];
          existing.project.sourceFiles[0].contents = contents;
          existing.signature = signature;
          changed = true;
        }
        if (existing?.signature === signature && await stat(resolve(dataDir, 'files', existing.file)).then(() => true, () => false)) {
          registerModel(db, existing.project, existing.file); continue;
        }
        if (prepared && await fileHash(file) !== prepared.sourceSha256) throw new Error('Source changed since package review; prepare the updated package before publishing.');
        if (cleanPreview && await fileHash(image) !== cleanPreview.sourceSha256) throw new Error('Source preview changed since cleanup; review the new image before publishing.');
        const type = await modelFileType(packageFile);
        const inspection = ['rar', 'zip'].includes(type) ? await inspectArchive(packageFile) : { entries: [basename(packageFile)], formats: [type] };
        if (!inspection.formats.length) throw new Error('No supported model formats verified inside package.');
        const title = archiveTitle(inspection.entries, basename(file, extname(file)));
        const metadata = classifyModel(title, relative(source, dirname(file)), override);
        const id = existing?.project.id || `model-${hash(key).slice(0, 24)}`;
        const digest = await fileHash(packageFile);
        const storedFile = `${id}-${digest.slice(0, 16)}.${type}`;
        const destination = resolve(dataDir, 'files', storedFile);
        if (!await stat(destination).then(() => true, () => false)) {
          const temp = `${destination}.partial`;
          await copyFile(packageFile, temp);
          if (await fileHash(temp) !== digest) { await rm(temp, { force: true }); throw new Error('File changed while copying; will retry.'); }
          await rename(temp, destination);
        }
        const after = await stat(file), photoAfter = await stat(image);
        if (after.size !== info.size || after.mtimeMs !== info.mtimeMs || photoAfter.mtimeMs !== photoInfo.mtimeMs) throw new Error('Source is still changing; will retry.');
        const packageAfter = await stat(packageFile), previewAfter = await stat(previewFile);
        if (packageAfter.size !== packageInfo.size || packageAfter.mtimeMs !== packageInfo.mtimeMs || previewAfter.mtimeMs !== previewInfo.mtimeMs) throw new Error('Prepared assets are still changing; will retry.');
        const preview = await sharp(previewFile).rotate().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
        const previewName = `${id}-${hash(preview).slice(0, 12)}.webp`;
        await writeFile(resolve(root, 'src/generated/model-previews', previewName), preview);
        const addedAt = existing?.project.addedAt || new Date(Object.keys(previous.records).length ? now :
          Math.min(now, Math.max(info.birthtimeMs || info.mtimeMs, photoInfo.birthtimeMs || photoInfo.mtimeMs))).toISOString();
        const project = { id, ...metadata, workType: '3d', ownership: 'curated', year: '', location: '', addedAt,
          formats: inspection.formats, mediumLabel: inspection.formats.map(type => type === 'max' ? '3DS Max' : type.toUpperCase()).join(' / '),
          shopCategories: [...new Set([metadata.category, metadata.category === 'decoration' ? 'decor' : metadata.category === 'interior materials' ? 'materials' : metadata.category])],
          summary: `${metadata.title}. ${metadata.itemType}${metadata.theme ? ` in ${metadata.theme} style` : ''}. Includes ${inspection.formats.join(', ').toUpperCase()} files.`,
          sourceFiles: [{ name: `${metadata.title}.${type}`, formats: inspection.formats, contents: inspection.contents || inspection.entries, url: `/api/designs/${id}/download` }],
        };
        records[key] = { project, signature, file: storedFile, sha256: digest, size: packageInfo.size, previewName, preview: preview.toString('base64') };
        registerModel(db, project, storedFile); changed = true;
      } catch (error) { issues.push({ key, reason: error.message }); }
    }
  } finally { db.close(); }
  for (const file of candidates.filter(file => !used.has(file))) issues.push({ key: relative(source, file), reason: 'No matching preview; not published.' });
  // Missing source disks/files never delete already imported customer assets.
  if (changed) await atomicJson(manifestFile, { records });
  const list = Object.values(records).sort((a, b) => b.project.addedAt.localeCompare(a.project.addedAt) || a.project.title.localeCompare(b.project.title));
  for (const record of list) {
    await ensureWatermarkedPreview(resolve(root, 'src/generated/model-previews', record.previewName),
      resolve(root, 'src/generated/model-previews', `marked-v1-${record.previewName}`));
  }
  const code = `// Generated by models:import. Originals remain in private storage.\nexport default [\n${list.map(record => `{...${JSON.stringify(record.project)},cover:new URL('./model-previews/marked-v1-${record.previewName}',import.meta.url).href,thumbnail:new URL('./model-previews/${record.previewName}',import.meta.url).href,gallery:[new URL('./model-previews/marked-v1-${record.previewName}',import.meta.url).href]}`).join(',\n')}\n];\n`;
  const output = resolve(root, 'src/generated/model-catalogue.js');
  if (code !== await readFile(output, 'utf8').catch(() => '')) { await atomicWrite(output, code); changed = true; }
  await atomicJson(resolve(dataDir, 'model-import-report.json'), { count: list.length, issues, checkedAt: new Date().toISOString() });
  return { changed, count: list.length, issues };
}

export function modelCataloguePlugin() {
  let root, server, timer, pending = Promise.resolve();
  const sync = () => pending = pending.catch(() => {}).then(() => importModelLibrary({ root })).then(result => {
    if (result.changed && server) server.ws.send({ type: 'full-reload', path: '*' });
    return result;
  });
  return { name: 'local-model-catalogue', async configResolved(config) { root = config.root; await sync(); },
    configureServer(vite) {
      server = vite;
      timer = setInterval(() => sync().catch(error => server.config.logger.error(error.message)), 15000);
      timer.unref(); server.httpServer?.once('close', () => clearInterval(timer));
    },
  };
}
