import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('About restores wallpaper content after visiting the 3D presentation', () => {
  const elements = new Map();
  const selectors = ['.page-hero .page-title', '.page-hero .page-lead', '.about-text > p:nth-of-type(1)',
    '[data-about-credential] .credential-value', '.principles li:nth-child(1)', '.showcase-section .section-title'];
  for (const selector of selectors) {
    let value = `Wallpaper original: ${selector}`;
    elements.set(selector, { get innerHTML() { return value; }, set innerHTML(next) { value = next; }, set textContent(next) { value = next; } });
  }
  const document = { body: { dataset: {} }, querySelector: () => null,
    querySelectorAll: selector => elements.has(selector) ? [elements.get(selector)] : [] };
  const context = vm.createContext({ document, location: { pathname: '/about.html' }, projects: [], brandDesignImage() {} });
  const code = readFileSync(new URL('../src/js/mode-content.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export function', 'function');
  vm.runInContext(code, context);
  context.updateModeContent('3d');
  assert.equal(elements.get('[data-about-credential] .credential-value').innerHTML, '3D assets & materials');
  assert.equal(elements.get('.principles li:nth-child(1)').innerHTML, 'Purposeful geometry');
  context.updateModeContent('wallpaper');
  for (const selector of selectors) assert.equal(elements.get(selector).innerHTML, `Wallpaper original: ${selector}`);
  context.updateModeContent('3d');
  assert.equal(elements.get('[data-about-credential] .credential-value').innerHTML, '3D assets & materials');
});
