import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).filter(item => item.startsWith('--')).map(item => {
  const [key, ...value] = item.slice(2).split('=');
  return [key, value.join('=')];
}));
const bucket = args.bucket;
const productSet = args['product-set'] || 'studio-viana-wallpapers';
if (!bucket || !/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(bucket) || !/^[a-zA-Z0-9_-]{1,128}$/.test(productSet)) {
  console.error('Usage: npm run visual-search:export -- --bucket=YOUR_GCS_BUCKET [--product-set=studio-viana-wallpapers]');
  process.exit(1);
}

const root = process.cwd();
const moduleUrl = pathToFileURL(resolve(root, 'src/generated/wallpaper-catalogue.js')).href;
const { default: catalogue } = await import(moduleUrl);
const designs = catalogue.filter(project => project.workType === 'wallpaper' && project.thumbnail?.startsWith('file:'));
if (!designs.length) throw new Error('No generated wallpaper catalogue found. Run npm run build first.');

const output = resolve(root, 'visual-search-export');
const imageDir = resolve(output, 'images');
await mkdir(imageDir, { recursive: true });
const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const rows = [];
for (const [index, project] of designs.entries()) {
  const imageId = 'cover';
  const filename = `${project.id}.jpg`;
  const destination = resolve(imageDir, filename);
  await copyFile(fileURLToPath(project.thumbnail), destination);
  const imageUri = `gs://${bucket}/visual-search/images/${filename}`;
  // Product Search CSV columns: image URI, image ID, set ID, product ID,
  // category, display name, labels, bounding polygon.
  rows.push([imageUri, imageId, productSet, project.id, 'homegoods-v2', project.title, '', ''].map(quote).join(','));
}
await writeFile(resolve(output, 'catalogue.csv'), `${rows.join('\n')}\n`, 'utf8');
console.log(`Exported ${designs.length} wallpaper designs to ${output}`);
console.log(`Product set: ${productSet}`);
console.log(`Upload images: gcloud storage cp --recursive "${imageDir}" gs://${bucket}/visual-search/`);
console.log(`Upload CSV:    gcloud storage cp "${resolve(output, 'catalogue.csv')}" gs://${bucket}/visual-search/catalogue.csv`);
