import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const origin = 'https://studioviana.work.gd';
const publicDir = resolve(root, 'public');
const pages = (await readdir(root, { withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
  .map(entry => entry.name)
  .sort();

const urls = [];
for (const page of pages) {
  const html = await readFile(resolve(root, page), 'utf8');
  const robots = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i)?.[1] ?? '';
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
  if (/noindex/i.test(robots) || !canonical || !canonical.startsWith(`${origin}/`)) continue;
  urls.push(canonical);
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(url => `  <url><loc>${url.replaceAll('&', '&amp;')}</loc></url>`),
  '</urlset>',
  '',
].join('\n');

await writeFile(resolve(publicDir, 'sitemap.xml'), sitemap, 'utf8');
console.log(`Generated public/sitemap.xml with ${urls.length} indexable canonical pages.`);
