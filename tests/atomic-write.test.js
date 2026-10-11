import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { atomicWrite } from '../server/atomic-write.js';

test('concurrent catalogue writes expose only complete files to readers', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'viana-atomic-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'catalogue.json');
  const versions = Array.from({ length: 8 }, (_, version) => JSON.stringify({ version, text: String(version).repeat(1024 * 1024) }));
  await atomicWrite(file, versions[0]);
  let finished = false;
  let failure;
  const writes = Promise.all(versions.map(content => atomicWrite(file, content)))
    .catch(error => { failure = error; }).finally(() => { finished = true; });
  do {
    const observed = await readFile(file, 'utf8');
    assert.ok(versions.includes(observed), 'reader must see a complete version');
  } while (!finished);
  await writes;
  if (failure) throw failure;
  assert.deepEqual(await readdir(directory), ['catalogue.json']);
});
