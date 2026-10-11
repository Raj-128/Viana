import { importModelLibrary, atomicJson } from '../server/model-library.js';
import { syncModelLibrary } from './sync-model-library.js';
import { resolve } from 'node:path';
import { open, readFile, rm, mkdir } from 'node:fs/promises';

const dataDir = resolve(process.env.STUDIO_DATA_DIR || '.private');
await mkdir(dataDir, { recursive: true });
const lockPath = resolve(dataDir, 'model-watcher.lock');
async function acquire() {
  try { return await open(lockPath, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(await readFile(lockPath, 'utf8').catch(() => '0'));
    if (!pid) return null;
    try { process.kill(pid, 0); return null; }
    catch (error) { if (error.code !== 'ESRCH') return null; }
    await rm(lockPath, { force: true }); return acquire();
  }
}
const watcherLock = await acquire();
if (!watcherLock) { console.log('A model watcher is already running.'); process.exit(0); }
await watcherLock.writeFile(String(process.pid));

let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });
console.log('Watching model library. New completed image/model pairs are imported every 15 seconds.');
try { while (!stopping) {
  const status = { checkedAt: new Date().toISOString() };
  try {
    status.local = await importModelLibrary();
    status.live = await syncModelLibrary();
    if (status.local.changed) console.log(`Local catalogue: ${status.local.count} models.`);
  } catch (error) { status.error = error.message; console.error(error.message); }
  await atomicJson(resolve(process.env.STUDIO_DATA_DIR || '.private', 'model-watch-status.json'), status);
  if (!stopping) await new Promise(resolve => setTimeout(resolve, 15000));
} } finally { await watcherLock.close(); await rm(lockPath, { force: true }); }
