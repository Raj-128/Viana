// Private files live either beside the database or in object storage, behind one
// interface, so the download, upload and import paths never learn which.
//
// A hosted container has an ephemeral filesystem: anything written locally is
// discarded on the next deploy, which took approved print files and model
// packages with it. The R2 store keeps them outside the container's lifetime.
import { createReadStream } from 'node:fs';
import { open, unlink, rename, stat, copyFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { Readable } from 'node:stream';
import { presign, sign, hashPayload, UNSIGNED } from './aws-signature.js';

const REGION = 'auto';
const SERVICE = 's3';

/** Reject a name that would escape its prefix before it reaches storage. */
function safeName(name) {
  const value = String(name || '');
  if (!value || value.includes('\0') || value.startsWith('/') || value.split(/[\\/]/).some(part => part === '..' || part.startsWith('.'))) {
    throw Object.assign(new Error('Invalid file name.'), { status: 403 });
  }
  return value;
}

export function createLocalStore(root) {
  const within = async name => {
    const target = resolve(root, safeName(name));
    const rel = relative(root, target);
    if (rel.startsWith('..') || isAbsolute(rel)) throw Object.assign(new Error('Invalid file name.'), { status: 403 });
    return target;
  };
  return {
    kind: 'local', root,
    async put(name, body, { exclusive = false } = {}) {
      const target = await within(name);
      const handle = await open(target, exclusive ? 'wx' : 'w');
      try {
        if (Buffer.isBuffer(body)) await handle.writeFile(body);
        else for await (const chunk of body) await handle.writeFile(chunk);
      } finally { await handle.close(); }
    },
    async copyFrom(source, name) { await copyFile(await realpath(source), await within(name), 1); },
    async move(from, to) { await rename(await within(from), await within(to)); },
    async stat(name) { return stat(await within(name)).then(info => (info.isFile() ? { size: info.size } : null)).catch(() => null); },
    async read(name) {
      const target = await within(name);
      const info = await stat(target).catch(() => null);
      if (!info?.isFile()) return null;
      return { size: info.size, stream: createReadStream(target) };
    },
    // Removing what is already gone is success; anything else is a real failure
    // the caller has to hear about, such as a receipt that could not delete a file.
    async remove(name) { await unlink(await within(name)).catch(error => { if (error.code !== 'ENOENT') throw error; }); },
    // Local development serves the bytes through this server; there is no
    // separate origin that could hold a link.
    async downloadUrl() { return null; },
  };
}

export function createR2Store({ accountId, bucket, accessKeyId, secretAccessKey, linkSeconds = 300, fetcher = fetch }) {
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) throw new Error('R2 storage needs an account id, bucket and API token.');
  const origin = `https://${accountId}.r2.cloudflarestorage.com`;
  const keyPath = name => `/${bucket}/${safeName(name)}`;

  async function request(method, name, { body, payloadHash, headers = {} } = {}) {
    const path = keyPath(name);
    const date = new Date();
    const stamp = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const hash = payloadHash ?? hashPayload(body);
    const signedHeaders = { host: `${accountId}.r2.cloudflarestorage.com`, 'x-amz-content-sha256': hash, 'x-amz-date': stamp, ...headers };
    const { authorization } = sign({ method, path, query: {}, headers: signedHeaders, payloadHash: hash,
      secret: secretAccessKey, accessKeyId, region: REGION, service: SERVICE, date });
    const init = { method, headers: { ...signedHeaders, Authorization: authorization } };
    if (body !== undefined && body !== null) {
      init.body = body;
      // A stream body is sent without buffering, which is the only way a
      // multi-gigabyte package moves through a small container.
      if (!Buffer.isBuffer(body)) init.duplex = 'half';
    }
    return fetcher(`${origin}${path}`, init);
  }

  const failed = async (response, action) => {
    const detail = await response.text().catch(() => '');
    return Object.assign(new Error(`Storage could not ${action} (${response.status}). ${detail.slice(0, 200)}`), { status: 502 });
  };

  return {
    kind: 'r2', bucket,
    async put(name, body, { exclusive = false, contentType, size } = {}) {
      if (exclusive && await this.stat(name)) throw Object.assign(new Error('That file already exists.'), { status: 409 });
      const headers = {};
      if (contentType) headers['content-type'] = contentType;
      if (size != null) headers['content-length'] = String(size);
      const streaming = !Buffer.isBuffer(body);
      const response = await request('PUT', name, { body, headers, payloadHash: streaming ? UNSIGNED : undefined });
      if (!response.ok) throw await failed(response, 'store this file');
    },
    async copyFrom(source, name) {
      const path = await realpath(source);
      const info = await stat(path);
      await this.put(name, Readable.toWeb(createReadStream(path)), { size: info.size });
    },
    async move(from, to) {
      // Copied inside the storage service rather than pulled through this server:
      // a finished upload is renamed without moving its bytes over the network again.
      const response = await request('PUT', to, { headers: { 'x-amz-copy-source': `/${bucket}/${safeName(from)}` } });
      if (response.status === 404) throw Object.assign(new Error('That file is unavailable.'), { status: 404 });
      if (!response.ok) throw await failed(response, 'move this file');
      await this.remove(from);
    },
    async stat(name) {
      const response = await request('HEAD', name);
      if (response.status === 404) return null;
      if (!response.ok) throw await failed(response, 'read this file');
      return { size: Number(response.headers.get('content-length') || 0) };
    },
    async read(name) {
      const response = await request('GET', name);
      if (response.status === 404) return null;
      if (!response.ok) throw await failed(response, 'read this file');
      return { size: Number(response.headers.get('content-length') || 0), stream: Readable.fromWeb(response.body) };
    },
    async remove(name) {
      const response = await request('DELETE', name);
      if (!response.ok && response.status !== 404) throw await failed(response, 'remove this file');
    },
    /**
     * A short-lived link the customer follows directly, so a large package never
     * passes through this server. Authorization still happened here: the link is
     * only made after the plan and ownership checks have run.
     */
    async downloadUrl(name, { filename, expires = linkSeconds } = {}) {
      return presign({
        url: `${origin}${keyPath(name)}`,
        query: filename ? { 'response-content-disposition': `attachment; filename="${filename.replace(/["\\]/g, '')}"` } : {},
        expires, secret: secretAccessKey, accessKeyId, region: REGION, service: SERVICE, date: new Date(),
      });
    },
  };
}

/** Production uses R2 when it is configured; everything else keeps the local directory. */
export function createFileStore(root, env = process.env) {
  if (env.R2_BUCKET && env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
    return createR2Store({
      accountId: env.R2_ACCOUNT_ID, bucket: env.R2_BUCKET,
      accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    });
  }
  return createLocalStore(root);
}
