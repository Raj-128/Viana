import test from 'node:test';
import assert from 'node:assert/strict';
import { initAdminTabs } from '../src/js/admin-tabs.js';
test('login defaults on, clicks and keyboard expose only the selected admin panel', () => {
  const tabs = ['login', 'wallpaper', 'models'].map(id => ({ dataset: { adminTab: id }, handlers: {}, attrs: {}, setAttribute(k,v) { this.attrs[k]=v; }, addEventListener(k,v) { this.handlers[k]=v; }, focus() { this.focused=true; } }));
  const panels = tabs.map(t => ({ dataset: { adminPanel: t.dataset.adminTab }, hidden: false }));
  initAdminTabs({ querySelectorAll: q => q === '[data-admin-tab]' ? tabs : panels });
  assert.deepEqual(panels.map(p => p.hidden), [false,true,true]);
  tabs[1].handlers.click();
  assert.deepEqual(panels.map(p => p.hidden), [true,false,true]);
  tabs[1].handlers.keydown({key:'ArrowRight',preventDefault(){}});
  assert.deepEqual(panels.map(p => p.hidden), [true,true,false]);
  assert.equal(tabs[2].focused,true);
  tabs[2].handlers.keydown({key:'Home',preventDefault(){}});
  assert.deepEqual(panels.map(p => p.hidden), [false,true,true]);
  assert.deepEqual(tabs.map(t => t.attrs['aria-selected']), ['true','false','false']);
});
