import { resolve } from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { watermarkPreview } from './preview-watermark.js';
import { atomicWrite } from './atomic-write.js';

export async function generateLegacyDetailPreviews(root) {
  const output = resolve(root, 'src/generated/detail-previews');
  await mkdir(output, { recursive: true });
  const inputs = Array.from({ length: 6 }, (_, index) => [`wallpaper-${index + 1}`, `src/assets/images/wallpapers/previews/${index + 1}.jpg`]);
  inputs.push(...['bathroom-accessories-1', 'aerial-texture-12'].map(name => [name, `src/generated/site-media/${name}.webp`]));
  for (const [name, file] of inputs) {
    const source = await readFile(resolve(root, file));
    const signature = createHash('sha256').update(source).digest('hex');
    const stamp = resolve(output, `${name}.sha256`), target = resolve(output, `${name}.webp`);
    if (await readFile(stamp, 'utf8').catch(() => '') === signature && await readFile(target).then(() => true, () => false)) continue;
    await atomicWrite(target, await watermarkPreview(source));
    await atomicWrite(stamp, signature);
  }
}

export function legacyDetailPreviewsPlugin() {
  return { name: 'legacy-detail-previews', async configResolved(config) { await generateLegacyDetailPreviews(config.root); } };
}
