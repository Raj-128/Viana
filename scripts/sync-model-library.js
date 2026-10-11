import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readJson } from '../server/model-library.js';

export async function syncModelLibrary({ dataDir = resolve(process.env.STUDIO_DATA_DIR || '.private'), remote = process.env.MODEL_SYNC_URL, token = process.env.MODEL_SYNC_TOKEN } = {}) {
  const settings = await readJson(resolve(dataDir, 'model-sync.json'), {});
  if (!remote && settings.enabled === false) return { configured: false };
  remote ||= settings.url; token ||= settings.token;
  if (!remote || !token) return { configured: false };
  const url = new URL(remote);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Live sync requires HTTPS.');
  const headers = { Authorization: `Bearer ${token}` };
  const request = async (path, options = {}) => {
    const response = await fetch(new URL(path, url), { ...options, headers: { ...headers, ...options.headers }, redirect: 'error', signal: AbortSignal.timeout(30 * 60000) });
    if (!response.ok) throw new Error(`Live sync HTTP ${response.status}: ${(await response.text()).slice(0, 180)}`);
    return response.json();
  };
  const remoteState = await request('/api/library-sync');
  const known = new Map(remoteState.models.map(item => [item.id, item]));
  const manifest = await readJson(resolve(dataDir, 'model-library.json'), { records: {} });
  let uploaded = 0;
  for (const record of Object.values(manifest.records)) {
    const existing = known.get(record.project.id);
    if (existing?.signature === record.signature) continue;
    if (existing?.sha256 !== record.sha256) {
      const stream = createReadStream(resolve(dataDir, 'files', record.file));
      try {
        await request(`/api/library-sync/${record.project.id}/file?sha256=${record.sha256}&type=${record.file.split('.').pop()}`, {
          method: 'POST', body: stream, duplex: 'half', headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(record.size) },
        });
      } finally { stream.destroy(); }
    }
    await request(`/api/library-sync/${record.project.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) });
    uploaded++; console.log(`Published: ${record.project.title}`);
  }
  return { configured: true, uploaded };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await syncModelLibrary();
  console.log(result.configured ? result : 'Live sync is not configured. Set MODEL_SYNC_URL and MODEL_SYNC_TOKEN, or .private/model-sync.json.');
  if (!result.configured) process.exitCode = 1;
}
