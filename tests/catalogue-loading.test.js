import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import full from '../src/generated/wallpaper-catalogue.js';
import featured from '../src/generated/wallpaper-featured.js';

test('landing-page selection preserves complete records but loads a small fraction of the catalogue', () => {
  assert.ok(featured.length <= 24);
  assert.ok(full.length > featured.length);
  for (const project of featured) assert.deepEqual(project, full.find(item => item.id === project.id));
  for (const project of full.slice(0, 6)) assert.ok(featured.some(item => item.id === project.id));
});

test('lazy catalogue hydration preserves array identity, other designs and every wallpaper', async () => {
  const source = readFileSync(new URL('../src/js/projects.js', import.meta.url), 'utf8');
  const loader = source.slice(source.indexOf('let cataloguePending;')).replaceAll('export ', '').replace("import('../generated/wallpaper-catalogue.js')", 'load()');
  const projects = [{ id: 'model-one' }, ...featured, { id: 'legacy-wallpaper' }];
  let calls = 0;
  const context = vm.createContext({ projects, localWallpapers: featured, load: async () => { calls++; return { default: full }; } });
  vm.runInContext(loader, context);
  const a = vm.runInContext('loadWallpaperCatalogue()', context);
  const b = vm.runInContext('loadWallpaperCatalogue()', context);
  assert.equal(a, b);
  assert.equal(await a, projects);
  assert.equal(calls, 1);
  assert.equal(projects.length, full.length + 2);
  assert.equal(new Set(projects.map(p => p.id)).size, projects.length);
  assert.equal(projects[0].id, 'model-one'); assert.equal(projects.at(-1).id, 'legacy-wallpaper');
});
