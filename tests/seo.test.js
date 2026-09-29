import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const base = 'https://raj-128.github.io/Viana/';

test('marketing metadata uses real production URLs and a published social image', () => {
  const titles = new Set();
  for (const page of ['index','about','services','contact','work']) {
    const html = read(page + '.html');
    const canonical = base + (page === 'index' ? '' : page + '.html');
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
    assert.ok(html.includes(`content="${base}studio-viana-logo.png"`));
    assert.doesNotMatch(html, /www\.studioviana\.com/);
    titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
  }
  assert.equal(titles.size, 5);
  assert.ok(existsSync(new URL('../public/studio-viana-logo.png', import.meta.url)));
  const schema = JSON.parse(read('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema['@graph'][0]['@type'], 'Organization');
  assert.equal(schema['@graph'][0].url, base);
});

test('sitemap contains only public, indexable pages and accounts stay excluded', () => {
  const auth = read('src/js/auth.js');
  const publicPages = JSON.parse(auth.match(/const PUBLIC_PAGES = new Set\((\[[^;]*?\])\)/)[1]);
  const sitemap = read('public/sitemap.xml');
  for (const [,location] of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
    assert.ok(location.startsWith(base));
    const file = location.slice(base.length) || 'index.html';
    assert.ok(publicPages.includes(file));
    assert.doesNotMatch(read(file), /name="robots" content="noindex/);
  }
  for (const page of ['login','admin-login','admin-downloads','project','work']) {
    assert.match(read(page + '.html'), /name="robots" content="noindex/);
    assert.ok(!sitemap.includes(page + '.html'));
  }
});
