import { resolve, sep } from 'node:path';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { readJson, atomicJson, fileHash, defaultModelSource } from '../server/model-library.js';

// Register an individually reviewed image edit without changing model originals.
const [key, editedImage] = process.argv.slice(2);
if (!key || !editedImage) throw new Error('Usage: node scripts/register-clean-model-preview.js "relative source IMAGE.jpg" "reviewed edit.png"');
const root = process.cwd();
const sourceRoot = resolve(process.env.MODEL_LIBRARY_DIR || defaultModelSource);
const source = resolve(sourceRoot, key);
if (!source.startsWith(sourceRoot + sep)) throw new Error('Image must belong to the source library.');
const manifest = await readJson(resolve(process.env.STUDIO_DATA_DIR || '.private', 'model-library.json'), { records: {} });
const record = manifest.records[key];
if (!record) throw new Error('Model is not registered in the library.');
const metadata = await sharp(editedImage).metadata();
if (metadata.format !== 'png' || !metadata.width || !metadata.height) throw new Error('A valid reviewed PNG is required.');
const file = `src/assets/images/clean-model-previews/${record.project.id}.png`;
await mkdir(resolve(root, 'src/assets/images/clean-model-previews'), { recursive: true });
await copyFile(editedImage, resolve(root, file));
const overridesFile = resolve(root, 'server/model-preview-overrides.json');
const overrides = await readJson(overridesFile, {});
overrides[key] = { file, sourceSha256: await fileHash(source) };
await atomicJson(overridesFile, overrides);
console.log(`Registered reviewed preview: ${record.project.title} (${(await stat(resolve(root, file))).size} bytes)`);
