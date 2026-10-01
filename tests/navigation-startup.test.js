import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('page transitions do not intercept links or schedule navigation delays', () => {
  const source = readFileSync(new URL('../src/js/premium.js', import.meta.url), 'utf8');
  const start = source.indexOf('function initPageTransitions()');
  const end = source.indexOf('\nfunction ', start + 1);
  const overlay = { style: {} };
  vm.runInNewContext(source.slice(start, end) + '\ninitPageTransitions();', {
    document: { getElementById: () => overlay,
      querySelectorAll: () => { throw Error('Must not intercept native navigation'); } },
    setTimeout: () => { throw Error('Must not delay navigation'); },
  });
  assert.equal(overlay.style.display, 'none');
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
