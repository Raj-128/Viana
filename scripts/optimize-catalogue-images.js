import { readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateWallpaperCatalogue } from '../server/wallpaper-catalogue.js';

const root = process.cwd();
async function previewBytes() {
  let bytes = 0;
  for (const folder of ['wallpaper-previews', 'hero-previews']) {
    const directory = resolve(root, 'src/generated', folder);
    for (const name of await readdir(directory).catch(error => {
      if (error.code === 'ENOENT') return [];
      throw error;
    })) {
      if (name.endsWith('.jpg')) bytes += (await stat(resolve(directory, name))).size;
    }
  }
  return bytes;
}

const before = await previewBytes();
console.log('Optimizing catalogue previews from available originals. The first run can take several minutes.');
const result = await generateWallpaperCatalogue(root);
const after = await previewBytes();
console.log(`${result.count} designs; public JPEG previews: ${before} -> ${after} bytes.`);
console.log(result.snapshot ? 'No originals available; preserved the committed public snapshot.' : 'Originals retained. Unchanged previews are cached for subsequent builds.');
if (result.errors.length) process.exitCode = 1;
