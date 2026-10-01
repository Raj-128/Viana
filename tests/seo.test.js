import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const base = 'https://studioviana.work.gd/';

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
  for (const page of ['about', 'services', 'contact']) {
    assert.ok(publicPages.includes(page + '.html'));
    assert.ok(sitemap.includes(base + page + '.html'));
    assert.doesNotMatch(read(page + '.html'), /data-auth-protected/);
    assert.match(read(page + '.html'), /name="robots" content="index, follow"/);
  }
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

test('business schema is in the head and homepage answers match visible content', () => {
  for (const page of ['index','about','services','contact']) {
    const html = read(page + '.html');
    const head = html.split('</head>')[0];
    const schema = JSON.parse(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.ok(schema['@graph'].some(node => node['@type'] === 'Person' && node.name === 'Vicky Rana'));
    assert.doesNotMatch(JSON.stringify(schema), /AggregateRating|reviewCount|streetAddress/);
    if (page === 'index') {
      const faq = schema['@graph'].find(node => node['@type'] === 'FAQPage');
      assert.equal(faq.mainEntity.length, 4);
      const body = html.split('</head>')[1];
      for (const question of faq.mainEntity) {
        assert.ok(body.includes('<h2>' + question.name + '</h2>'));
        assert.ok(body.includes('<p>' + question.acceptedAnswer.text + '</p>'));
      }
    }
  }
  assert.match(read('public/robots.txt'), /Sitemap: https:\/\/studioviana\.work\.gd\/sitemap\.xml/);
});
