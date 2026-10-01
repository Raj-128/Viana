import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const output = resolve('src/generated/site-media');
await mkdir(output, { recursive: true });
const images = [
  ['flower.png', 128], ['vt-logo-black.png', 512],
  ['vicky-profile.jpeg', 800], ['vicky-profile-2.png', 960],
  ['three-d-lunar-console.png', 1440], ['three-d-petal-lamp.png', 1440],
  ['three-d-playroom.png', 1440], ['three-d-canyon-void.png', 1440],
];
let before = 0, after = 0;
for (const [name, size] of images) {
  const source = await readFile(resolve('src/assets/images', name));
  const optimized = await sharp(source).rotate().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toBuffer();
  await writeFile(resolve(output, name.replace(/\.[^.]+$/, '.webp')), optimized);
  before += source.length; after += optimized.length;
}
await sharp('src/assets/images/flower.png').resize(64, 64).png({ palette: true }).toFile(resolve(output, 'favicon.png'));
await sharp('src/assets/images/flower.png').resize(512, 512, { fit: 'inside', withoutEnlargement: true }).png({ palette: true, quality: 90 }).toFile('public/studio-viana-logo.png');
console.log(`Optimized ${images.length} site images: ${before} -> ${after} bytes (${(100 - after / before * 100).toFixed(1)}% smaller). Originals retained.`);
