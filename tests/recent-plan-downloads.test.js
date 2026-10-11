import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('recent history renders image, filename, timestamp and model link; logout clears it', async () => {
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    addEventListener() {}
  }
  const host = new Element('div'), status = new Element('p');
  const source = readFileSync(new URL('../src/js/recent-plan-downloads.js', import.meta.url), 'utf8')
    .replace(/^const loadCatalogue = .*;\r?\n/m, '').replace('export async function', 'async function');
  const context = vm.createContext({
    document: { getElementById: id => id === 'recent-downloads-list' ? host : status, createElement: tag => new Element(tag) },
    loadCatalogue: async () => [{ id: 'chair', workType: '3d', title: 'Lounge Chair', thumbnail: 'chair.webp' }],
    entries: [{ design_id: 'chair', file_name: 'chair.max', downloaded_at: 1791619200000 }],
  });
  vm.runInContext(source, context);
  await vm.runInContext('renderRecentDownloads(entries)', context);
  const link = host.children[0].children[0];
  assert.equal(link.href, 'project.html?id=chair');
  assert.equal(link.children[0].src, 'chair.webp');
  assert.equal(link.children[1].children[0].textContent, 'Lounge Chair');
  assert.equal(link.children[1].children[1].textContent, 'chair.max');
  assert.ok(link.children[1].children[2].dateTime);
  await vm.runInContext('renderRecentDownloads([], {signedIn:false})', context);
  assert.equal(host.children.length, 0);
  assert.match(status.textContent, /Sign in/);
});
