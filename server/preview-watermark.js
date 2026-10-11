import sharp from 'sharp';
import { readFile, stat } from 'node:fs/promises';
import { atomicWrite } from './atomic-write.js';

// Baked pixels survive direct image downloads; CSS overlays do not.
export async function watermarkPreview(source) {
  const { data, info } = await sharp(source, { limitInputPixels: 80000000 }).rotate()
    .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
    .png().toBuffer({ resolveWithObject: true });
  const size = Math.max(8, Math.round(info.width / 30));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${info.width}" height="${info.height}"><defs><pattern id="mark" width="${size * 10}" height="${size * 5}" patternUnits="userSpaceOnUse"><text x="${size}" y="${size * 3}" transform="rotate(-28 ${size * 5} ${size * 2.5})" font-family="Arial,sans-serif" font-size="${size}" font-weight="bold" fill="white" fill-opacity=".65" stroke="#222" stroke-opacity=".4" stroke-width=".6">STUDIO VIANA</text></pattern></defs><rect width="100%" height="100%" fill="url(#mark)"/></svg>`;
  return sharp(data).composite([{ input: Buffer.from(svg) }]).webp({ quality: 82 }).toBuffer();
}

export async function ensureWatermarkedPreview(source, destination) {
  if (await stat(destination).then(() => true, () => false)) return;
  await atomicWrite(destination, await watermarkPreview(await readFile(source)));
}
