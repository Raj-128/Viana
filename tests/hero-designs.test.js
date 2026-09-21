import test from 'node:test';
import assert from 'node:assert/strict';
import { selectHeroDesigns } from '../src/js/hero-designs.js';

test('both wallpaper rails use distinct artwork mixed across collections', () => {
  const projects = ['A', 'B', 'C'].flatMap(collection => Array.from({ length: 12 }, (_, index) => ({
    id: `${collection}-${index}`, cover: `${collection}-${index}.jpg`, collection, workType: 'wallpaper',
  })));
  projects.unshift({ ...projects[0], id: 'duplicate' });
  const selected = selectHeroDesigns(projects);
  assert.equal(selected.length, 18);
  assert.equal(new Set(selected.map(project => project.cover)).size, 18);
  assert.deepEqual(selected.slice(0, 3).map(project => project.collection), ['A', 'B', 'C']);
  const right = new Set(selected.slice(0, 9).map(project => project.cover));
  assert.ok(selected.slice(9).every(project => !right.has(project.cover)));
  assert.equal(projects.length, 37, 'source catalogue is not mutated');
});
