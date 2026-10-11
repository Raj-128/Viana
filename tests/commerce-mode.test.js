import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { filterCommerceEntries } from '../src/js/commerce-mode.js';
import { createCommerceStore } from '../src/js/commerce-store.js';

test('switching sections isolates cart, downloads, counts and checkout without deleting saved items', () => {
  const projects = [
    { id: 'wall', title: 'Floral Wallpaper', workType: 'wallpaper', cover: 'wall.jpg' },
    { id: 'model', title: 'Bathroom Model', workType: '3d', cover: 'model.jpg' },
  ];
  const data = new Map();
  const store = createCommerceStore({ getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }, projects);
  projects.forEach(project => { store.add(project); store.recordDownload(project); });
  store.quantity('wall', 3);
  const nodes = new Map();
  function node(selector) {
    if (!nodes.has(selector)) nodes.set(selector, { textContent: '', innerHTML: '', hidden: false,
      querySelector: child => node(selector + ' ' + child), querySelectorAll: () => [] });
    return nodes.get(selector);
  }
  const badges = ['cart', 'downloads'].map(kind => ({ dataset: { commerceCount: kind } }));
  const document = { documentElement: { dataset: { studioMode: '3d' } },
    querySelectorAll: selector => selector === '[data-commerce-count]' ? badges : [] };
  const context = vm.createContext({ document, store, projects, filterCommerceEntries,
    dialog: { querySelector: node, querySelectorAll: () => [] },
    renderedMode: undefined, selectedDownload: undefined, activeTab: 'cart', notice: '',
    commerceMode: () => document.documentElement.dataset.studioMode,
    getSession: () => ({ role: 'user' }), downloading: new Set(), printDownloads: new Set(),
    printRequests: [{ id: 'print', design_id: 'wall', status: 'approved' }],
    accessRequests: [{ design_id: 'wall', status: 'pending' }], approvedDesigns: [], printRequestError: '',
    printRequestSummary: () => 'Wallpaper print size', hasDirectModelDownload: () => false,
    escape: String, basketIcon: '', downloadIcon: '',
  });
  const source = readFileSync(new URL('../src/js/commerce.js', import.meta.url), 'utf8');
  vm.runInContext(source.slice(source.indexOf('export function renderCommerce'), source.indexOf('export function initCommerce')).replace('export function', 'function'), context);
  const render = () => vm.runInContext('renderCommerce()', context);
  render();
  assert.match(node('.commerce-items').innerHTML, /Bathroom Model/);
  assert.doesNotMatch(node('.commerce-items').innerHTML, /Floral Wallpaper/);
  assert.equal(badges[0].textContent, 1);
  assert.equal(badges[1].textContent, 1);
  let message = new URL(node('.commerce-checkout').href).searchParams.get('text');
  assert.match(message, /Bathroom Model/);
  assert.doesNotMatch(message, /Floral Wallpaper|wall measurements/);
  context.activeTab = 'downloads'; render();
  assert.equal(node('[data-print-requests]').hidden, true);
  assert.equal(node('.commerce-requests').hidden, true);
  document.documentElement.dataset.studioMode = 'wallpaper'; render();
  assert.match(node('.commerce-items').innerHTML, /Floral Wallpaper/);
  assert.doesNotMatch(node('.commerce-items').innerHTML, /Bathroom Model/);
  assert.equal(node('[data-print-requests]').hidden, false);
  assert.equal(badges[0].textContent, 3);
  assert.equal(badges[1].textContent, 2);
  context.activeTab = 'cart'; render();
  message = new URL(node('.commerce-checkout').href).searchParams.get('text');
  assert.match(message, /Floral Wallpaper/);
  assert.doesNotMatch(message, /Bathroom Model/);
  assert.equal(store.cart().length, 2);
  assert.equal(store.downloads().length, 2);
  store.remove('studioQuoteSelections', 'model');
  document.documentElement.dataset.studioMode = '3d'; render();
  assert.match(node('.commerce-items').innerHTML, /Your 3D cart is empty/);
  assert.equal(node('.commerce-footer').hidden, true);
  assert.equal(store.cart()[0].id, 'wall');
});
