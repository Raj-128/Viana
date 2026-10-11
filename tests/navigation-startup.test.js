import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('category links keep native immediate navigation', () => {
  const source = readFileSync(new URL('../src/js/shop-categories.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /preventDefault|setTimeout|playFormatTransition/);
  assert.match(source, /element.href = 'work.html\?mode=3d&format='/);
});

test('public pages render before session response and Google starts before session wait', () => {
  const main = readFileSync(new URL('../src/js/main.js', import.meta.url), 'utf8');
  assert.match(main, /const publicPage = isPublicPage\(\)/);
  assert.match(main, /if \(!publicPage\) \{\s+await authReady/);
  const auth = readFileSync(new URL('../src/js/auth.js', import.meta.url), 'utf8');
  const startup = auth.slice(auth.lastIndexOf('document.addEventListener("DOMContentLoaded"'));
  assert.ok(startup.indexOf('initGoogleSignIn(') < startup.indexOf('await authReady'));
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /data-open-commerce="cart"/);
  assert.match(html, /data-open-commerce="downloads"/);
});
