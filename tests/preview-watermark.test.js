import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { watermarkPreview } from '../server/preview-watermark.js';

test('detail watermark changes image pixels without mutating the clean browsing source', async () => {
  const source = await sharp({ create: { width: 640, height: 480, channels: 3, background: '#888888' } }).webp().toBuffer();
  const original = Buffer.from(source);
  const marked = await watermarkPreview(source);
  assert.deepEqual(source, original);
  assert.notDeepEqual(marked, source);
  const metadata = await sharp(marked).metadata();
  assert.equal(metadata.width, 640); assert.equal(metadata.height, 480);
  const stats = await sharp(marked).stats();
  assert.ok(stats.channels.some(channel => channel.stdev > 5), 'watermark is baked into the pixels');
});
