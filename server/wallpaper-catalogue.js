import { readdir, readFile, writeFile, mkdir, stat, access } from 'node:fs/promises';
import { resolve, relative, extname, basename, dirname, sep, posix } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { selectHeroDesigns } from '../src/js/hero-designs.js';
import { atomicWrite } from './atomic-write.js';

const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']);
const siteImages = new Set(['flower.png', 'vt-logo-black.png', 'vicky-profile.jpeg', 'vicky-profile-2.png', 'three-d-lunar-console.png', 'three-d-petal-lamp.png', 'three-d-playroom.png', 'three-d-canyon-void.png']);
const digest = data => createHash('sha256').update(data).digest('hex');
// Regenerate from originals once when encoding changes, never repeatedly
// recompress an already-lossy preview during normal builds.
const previewProfile = 'mozjpeg-78-detail-76-card-v1';
// Keep the landing page independent of the full browsing catalogue. The
// generated snapshot is also committed for deployments without private files.
async function writeFeaturedCatalogue(generated, code) {
  const lines = code.split('\n');
  const rows = lines.filter(line => line.startsWith('{...'));
  const selected = [...new Set([...rows.slice(0, 6), ...rows.filter(row => row.includes('heroCover:'))])];
  const references = new Set(selected.flatMap(row => row.match(/\b(?:image|hero)\d+\b/g) || []));
  const imports = lines.filter(line => line.startsWith('const ') && references.has(line.split(' ')[1]));
  const featured = `${imports.join('\n')}\nexport default [\n${selected.map(row => row.replace(/,$/, '')).join(',\n')}\n];\n`;
  const file = resolve(generated, 'wallpaper-featured.js');
  if (featured !== await readFile(file, 'utf8').catch(() => '')) await atomicWrite(file, featured);
}
// Filenames become text in existing HTML templates, never markup.
const titleCase = text => text.replace(/[<>&"']/g, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase().replace(/\b\p{L}/gu, letter => letter.toUpperCase());
const themeFor = name => {
  const value = name.toLowerCase();
  if (/kid|child|nursery/.test(value)) return 'child';
  if (/floral|flower/.test(value)) return 'floral';
  if (/tropic|topic|forest|botanic|nature/.test(value)) return 'nature';
  if (/luxury|stone|marble/.test(value)) return 'luxury';
  if (/abstract|geometr|artistic|topographic/.test(value)) return 'abstract';
  return 'minimal';
};
async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(file));
    else if (extensions.has(extname(entry.name).toLowerCase())) files.push(file);
  }
  return files;
}

export async function generateWallpaperCatalogue(root, onWarning = console.warn) {
  const imagesRoot = resolve(root, 'src/assets/images');
  const library = resolve(imagesRoot, 'wallpapers/library');
  const generated = resolve(root, 'src/generated');
  const previews = resolve(generated, 'wallpaper-previews');
  const cacheFile = resolve(root, '.private/wallpaper-catalogue-cache.json');
  await mkdir(library, { recursive: true });
  await mkdir(previews, { recursive: true });
  await mkdir(dirname(cacheFile), { recursive: true });
  const directories = (await readdir(imagesRoot, { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && !['wallpapers', '3d file', 'clean-model-previews'].includes(entry.name.toLowerCase()) && !entry.name.startsWith('.'));
  const files = [...await filesUnder(library)];
  for (const entry of await readdir(imagesRoot, { withFileTypes: true })) {
    if (entry.isFile() && extensions.has(extname(entry.name).toLowerCase()) && !siteImages.has(entry.name)) files.push(resolve(imagesRoot, entry.name));
  }
  for (const directory of directories) files.push(...await filesUnder(resolve(imagesRoot, directory.name)));
  for (const entry of await readdir(resolve(imagesRoot, 'wallpapers'), { withFileTypes: true })) {
    if (entry.isFile() && extensions.has(extname(entry.name).toLowerCase()) && !/^[1-6]\.jpeg$/i.test(entry.name)) files.push(resolve(imagesRoot, 'wallpapers', entry.name));
    if (entry.isDirectory() && !['library', 'optimized', 'previews'].includes(entry.name)) files.push(...await filesUnder(resolve(imagesRoot, 'wallpapers', entry.name)));
  }
  const cacheText = await readFile(cacheFile, 'utf8').catch(() => null);
  // A clean checkout includes the public catalogue snapshot, not private
  // originals. Keep that snapshot until a source library is provided.
  const hasWallpaperSources = files.length > 0;
  if (!hasWallpaperSources && !cacheText) {
    const snapshot = await readFile(resolve(generated, 'wallpaper-catalogue.js'), 'utf8').catch(() => null);
    if (snapshot) {
      await writeFeaturedCatalogue(generated, snapshot);
      return { count: (snapshot.match(/cover:image/g) || []).length, errors: [], changed: false, snapshot: true };
    }
  }
  const cache = JSON.parse(cacheText || '{}');
  const nextCache = {}, seen = new Set(), designs = [], errors = [];
  const sourceFiles = new Map();
  const refreshPreviews = new Set();
  for (const file of files) {
    const key = relative(root, file).split(sep).join('/');
    try {
      const info = await stat(file);
      const signature = `${info.size}:${info.mtimeMs}`;
      let hash = cache[key]?.signature === signature ? cache[key].hash : null;
      let source;
      if (!hash) { source = await readFile(file); hash = digest(source); }
      nextCache[key] = { signature, hash, previewProfile };
      if (seen.has(hash)) continue;
      seen.add(hash);
      sourceFiles.set(`${hash}.jpg`, file);
      if (cache[key]?.previewProfile !== previewProfile) refreshPreviews.add(`${hash}.jpg`);
      const output = resolve(previews, `${hash}.jpg`);
      if (refreshPreviews.has(`${hash}.jpg`) || !await access(output).then(() => true, () => false)) {
        const { data, info: resized } = await sharp(source || await readFile(file), { limitInputPixels: 80000000 })
          .rotate().resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
          .flatten({ background: '#eee9e2' }).png().toBuffer({ resolveWithObject: true });
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${resized.width}" height="${resized.height}"><defs><pattern id="mark" width="230" height="130" patternUnits="userSpaceOnUse"><text x="12" y="75" transform="rotate(-28 110 65)" font-family="Arial,sans-serif" font-size="19" font-weight="bold" fill="white" fill-opacity=".6" stroke="#222" stroke-opacity=".4" stroke-width=".6">STUDIO VIANA</text></pattern></defs><rect width="100%" height="100%" fill="url(#mark)"/></svg>`;
        await atomicWrite(output, await sharp(data).composite([{ input: Buffer.from(svg) }])
          .jpeg({ quality: 78, mozjpeg: true }).toBuffer());
      }
      const fromLibrary = relative(library, file);
      const parts = (fromLibrary.startsWith('..') ? relative(imagesRoot, file) : fromLibrary).split(sep);
      const collection = titleCase(parts.length > 1 ? parts[0] : 'Studio Collection');
      const category = parts.length > 2 ? titleCase(parts[parts.length - 2]) : collection;
      const stem = basename(file, extname(file));
      const rimura = stem.match(/^(.+)-Rimura-(\d+)-rel/i);
      const rebel = /rebel/i.test(collection) ? stem.match(/(?:^|_)(R\d+)(?:_|$)/i) : null;
      const numbered = /unique places/i.test(collection) ? stem.match(/^(\d+)(?:\.\d+)?$/) : null;
      const product = rimura?.[2] || rebel?.[1] || numbered?.[1];
      const name = titleCase(rimura?.[1] || rebel?.[1] || numbered?.[1] || stem) || 'Untitled';
      designs.push({ id: `local-${hash.slice(0, 24)}`, title: `${collection} — ${name}`, collection,
        category, theme: themeFor(parts.join(' ')), workType: 'wallpaper', ownership: 'curated',
        year: '', location: '', mediumLabel: 'Wallpaper',
        summary: `${name} from the ${collection} collection${category !== collection ? ` / ${category}` : ''}.`,
        preview: `${hash}.jpg`, productKey: product ? `${collection}/${product}` : null,
      });
    } catch (error) {
      delete nextCache[key];
      const message = `${key}: ${error.message}`;
      errors.push(message); onWarning(`Wallpaper skipped: ${message}`);
    }
  }
  const grouped = new Map();
  for (const { preview, productKey, ...design } of designs) {
    const id = productKey ? `local-${digest(productKey).slice(0, 24)}` : design.id;
    if (!grouped.has(id)) grouped.set(id, { ...design, id, previews: [] });
    grouped.get(id).previews.push(preview);
  }
  const imageNames = new Map(designs.map((design, index) => [design.preview, `image${index}`]));
  // Static new URL references still bundle in production, but avoid thousands
  // of individual ?import module requests on the local Vite server.
  const imports = designs.map((design, index) => `const image${index} = new URL('./wallpaper-previews/${design.preview}', import.meta.url).href;`);
  // Browsing cards use clean, smaller thumbnails. Detail covers/galleries
  // continue to use the separately generated, baked-in watermarks.
  const heroFolder = resolve(generated, 'hero-previews');
  await mkdir(heroFolder, { recursive: true });
  const heroImages = new Map();
  const catalogue = [...grouped.values()];
  const featuredIds = new Set(selectHeroDesigns(catalogue.map(design => ({ ...design, cover: design.previews[0] }))).map(design => design.id));
  for (const [index, design] of catalogue.entries()) {
    const filename = design.previews[0];
    const output = resolve(heroFolder, filename);
    if (refreshPreviews.has(filename) || !await access(output).then(() => true, () => false)) {
      await atomicWrite(output, await sharp(await readFile(sourceFiles.get(filename)), { limitInputPixels: 80000000 }).rotate()
        .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#eee9e2' }).jpeg({ quality: 76, mozjpeg: true }).toBuffer());
    }
    imports.push(`const hero${index} = new URL('./hero-previews/${filename}', import.meta.url).href;`);
    heroImages.set(design.id, `hero${index}`);
  }
  const rows = [...grouped.values()].map(({ previews: images, ...design }) =>
    `{...${JSON.stringify(design)},thumbnail:${heroImages.get(design.id)},${featuredIds.has(design.id) ? `heroCover:${heroImages.get(design.id)},` : ''}cover:${imageNames.get(images[0])},gallery:[${images.map(image => imageNames.get(image)).join(',')}]}`);
  const code = `${imports.join('\n')}\nexport default [\n${rows.join(',\n')}\n];\n`;
  const moduleFile = resolve(generated, 'wallpaper-catalogue.js');
  const changed = code !== await readFile(moduleFile, 'utf8').catch(() => '');
  if (changed) await atomicWrite(moduleFile, code);
  await writeFeaturedCatalogue(generated, code);
  await atomicWrite(cacheFile, JSON.stringify(nextCache));
  return { count: grouped.size, images: designs.length, duplicates: files.length - designs.length - errors.length, errors, changed };
}

export function wallpaperCataloguePlugin() {
  let root, server, timer, pending = Promise.resolve();
  const sync = () => pending = pending.catch(() => {}).then(async () => {
    const result = await generateWallpaperCatalogue(root);
    if (result.changed && server) server.ws.send({ type: 'full-reload', path: '*' });
    return result;
  });
  return {
    name: 'local-wallpaper-catalogue',
    async configResolved(config) { root = config.root; await sync(); },
    configureServer(vite) {
      server = vite;
      const imagesRoot = resolve(root, 'src/assets/images');
      server.watcher.add(imagesRoot);
      const onFile = file => {
        if (!resolve(file).startsWith(imagesRoot + sep)) return;
        clearTimeout(timer);
        timer = setTimeout(() => sync().catch(error => server.config.logger.error(error.stack)), 750);
      };
      server.watcher.on('add', onFile).on('change', onFile).on('unlink', onFile);
      server.httpServer?.once('close', () => {
        clearTimeout(timer);
        for (const event of ['add', 'change', 'unlink']) server.watcher.off(event, onFile);
      });
      server.middlewares.use((req, res, next) => {
        let path;
        try { path = posix.normalize(decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replaceAll('\\', '/')).toLowerCase(); }
        catch { res.writeHead(400); return res.end(); }
        const prefix = '/src/assets/images/';
        const at = path.indexOf(prefix);
        if (at >= 0) {
          const rest = path.slice(at + prefix.length);
          if (!siteImages.has(rest) && !rest.startsWith('wallpapers/previews/')) {
            res.writeHead(403, { 'Cache-Control': 'no-store' }); return res.end('Forbidden');
          }
        }
        next();
      });
    },
  };
}
