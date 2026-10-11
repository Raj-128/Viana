import test from 'node:test';
import assert from 'node:assert/strict';
import { matchingSourceFiles, filterShopProjects, countShopFormats } from '../src/js/shop-catalogue.js';

const catalogue = [
  { id: 'render', workType: '3d', cover: 'preview.webp', sourceFiles: [{ name: 'preview.webp', url: '/preview.webp' }] },
  { id: 'blend', workType: '3d', shopCategories: ['furniture'], price: 0, sourceFiles: [{ name: 'chair.BLEND', url: '/protected/chair' }, { name: 'chair.obj', url: '/protected/obj' }] },
  { id: 'max', workType: '3d', shopCategories: ['lighting'], sourceFiles: [{ name: 'lamp.max', url: '/protected/lamp' }] },
  { id: 'wall', workType: 'wallpaper', sourceFiles: [{ name: 'wall.blend', url: '/protected/wall' }] },
];

test('format counts match catalogue models, deduplicate package variants and include zero counts', () => {
  const counts = countShopFormats([...catalogue, { id: 'package', workType: '3d', sourceFiles: [
    { name: 'set.rar', url: '/protected/set', formats: ['max', 'max', 'fbx', 'obj'] },
    { name: 'set.obj', url: '/protected/obj' },
  ] }]);
  assert.equal(counts.max, 2);
  assert.equal(counts.blend, 1);
  assert.equal(counts['fbx-obj'], 2);
  assert.equal(counts.fbx, 1);
  assert.equal(counts.obj, 2);
  for (const format of ['unreal', 'c4d', 'materials', 'stl', 'autocad', 'sketchup']) assert.equal(counts[format], 0);
});

test('model packages match their verified contents, not unrelated formats', () => {
  const packageFile = { name: 'Bathroom Accessories.rar', formats: ['fbx', 'obj', 'max'], url: '/api/designs/bathroom-accessories-1/download' };
  const project = { workType: '3d', sourceFiles: [packageFile] };
  assert.deepEqual(matchingSourceFiles(project, 'fbx-obj'), [packageFile]);
  assert.deepEqual(matchingSourceFiles(project, 'max'), [packageFile]);
  assert.deepEqual(matchingSourceFiles(project, 'stl'), []);
  assert.deepEqual(matchingSourceFiles({ sourceFiles: [{ ...packageFile, formats: undefined }] }), []);
});
test('source extension selects only matching files, never a render or another format', () => {
  assert.deepEqual(filterShopProjects(catalogue, { format: 'blend' }).map(p => p.id), ['blend']);
  assert.deepEqual(matchingSourceFiles(catalogue[1], 'fbx-obj').map(f => f.name), ['chair.obj']);
  assert.equal(matchingSourceFiles(catalogue[0]).length, 0);
  assert.equal(filterShopProjects(catalogue, { format: 'c4d' }).length, 0);
  assert.equal(filterShopProjects(catalogue, { format: 'unknown' }).length, 0);
});
test('format and category intersect, clear restores 3D projects and free requires files', () => {
  assert.equal(filterShopProjects(catalogue, { format: 'blend', category: 'lighting' }).length, 0);
  assert.equal(filterShopProjects(catalogue, { format: 'blend', category: 'furniture' }).length, 1);
  assert.deepEqual(filterShopProjects(catalogue).map(p => p.id), ['render', 'blend', 'max']);
  assert.deepEqual(filterShopProjects(catalogue, { category: 'free' }).map(p => p.id), ['blend']);
});
test('missing source metadata and unsafe URLs do not qualify as source files', () => {
  assert.deepEqual(matchingSourceFiles({}), []);
  assert.deepEqual(matchingSourceFiles({ sourceFiles: [{ name: 'x.max', url: 'javascript:alert(1)' }, { name: 'x.max' }] }), []);
});
