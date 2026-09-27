import { randomUUID, createHash } from 'node:crypto';
import { open, unlink, realpath, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';

const papers = new Set(['standard', 'canvas', 'feather', 'linen', 'earthy']);
const formats = { 'application/pdf': '.pdf', 'image/tiff': '.tif', 'image/jpeg': '.jpg', 'image/png': '.png' };
const maxBytes = 250 * 1024 * 1024;
const version = file => file ? createHash('sha256').update(file).digest('hex') : null;
const publicRequest = ({ file, fingerprint, ...request }) => ({ ...request, file_ready: Boolean(file), file_version: version(file) });
function fileType(bytes) {
  if (bytes.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (['49492a00', '4d4d002a', '49492b00', '4d4d002b'].includes(bytes.subarray(0, 4).toString('hex'))) return 'image/tiff';
  if (bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return 'image/jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  return null;
}

export function createPrintRequests({ db, filesRoot, sessionUser, readBody, json, fail, limit }) {
  // Additive migration: existing design downloads and accounts remain intact.
  db.exec(`CREATE TABLE IF NOT EXISTS print_requests (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), design_id TEXT NOT NULL,
    width REAL NOT NULL, height REAL NOT NULL, paper TEXT NOT NULL, quantity INTEGER NOT NULL,
    fingerprint TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    file TEXT, mime TEXT, file_bytes INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS print_requests_customer ON print_requests(user_id, created_at);`);
  const get = id => db.prepare('SELECT * FROM print_requests WHERE id=?').get(id);
  return async (req, res, path) => {
    if (!/^\/api\/(?:admin\/)?print-requests(?:\/|$)/.test(path)) return false;
    const user = sessionUser(req);
    if (!user) throw fail(401, 'Please sign in to view or send a design request.');
    const admin = path.startsWith('/api/admin/');
    if (admin && user.role !== 'admin') throw fail(403, 'Administrator access is required.');
    res.setHeader('Cache-Control', 'no-store');
    if (path === '/api/print-requests' && req.method === 'GET') {
      json(res, 200, { requests: db.prepare('SELECT * FROM print_requests WHERE user_id=? ORDER BY created_at DESC').all(user.id).map(publicRequest) });
      return true;
    }
    if (path === '/api/print-requests' && req.method === 'POST') {
      limit(`print-request:${user.id}`, 30);
      const { designId, width, height, paper, quantity } = await readBody(req);
      if (typeof designId !== 'string' || !/^[a-z0-9-]{1,100}$/.test(designId) ||
          ![width, height].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 15.75 && n <= 196.85) ||
          !papers.has(paper) || !Number.isInteger(quantity) || quantity < 1 || quantity > 12) {
        throw fail(400, 'Choose a design, valid dimensions in inches, paper and quantity.');
      }
      const w = Math.round(width * 100) / 100, h = Math.round(height * 100) / 100;
      const fingerprint = createHash('sha256').update(JSON.stringify([designId, w, h, paper, quantity])).digest('hex');
      const existing = db.prepare("SELECT * FROM print_requests WHERE user_id=? AND fingerprint=? AND status IN ('pending','approved') ORDER BY created_at DESC LIMIT 1").get(user.id, fingerprint);
      if (existing) { json(res, 200, { request: publicRequest(existing) }); return true; }
      const id = randomUUID(), now = Date.now();
      db.prepare('INSERT INTO print_requests (id,user_id,design_id,width,height,paper,quantity,fingerprint,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(id, user.id, designId, w, h, paper, quantity, fingerprint, now, now);
      json(res, 201, { request: publicRequest(get(id)) });
      return true;
    }
    if (path === '/api/admin/print-requests' && req.method === 'GET') {
      json(res, 200, { requests: db.prepare('SELECT r.*,u.name,u.email FROM print_requests r JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC').all().map(publicRequest) });
      return true;
    }
    const match = path.match(/^\/api\/(admin\/)?print-requests\/([a-f0-9-]{36})\/(file|decision|download)$/);
    if (!match) throw fail(404, 'Request not found.');
    const request = get(match[2]);
    if (!request || (!admin && user.role !== 'admin' && request.user_id !== user.id)) throw fail(404, 'Request not found.');
    if (admin && match[3] === 'file' && req.method === 'POST') {
      if (request.status !== 'pending') throw fail(409, 'Only pending requests can receive a file.');
      limit(`print-upload:${user.id}`, 30);
      const mime = req.headers['content-type']?.split(';')[0];
      if (!formats[mime]) throw fail(415, 'Choose a PDF, TIFF, JPG or PNG print file.');
      if (Number(req.headers['content-length']) > maxBytes) throw fail(413, 'Use a file up to 250 MB.');
      const filename = `${randomUUID()}${formats[mime]}`, target = resolve(filesRoot, filename);
      const handle = await open(target, 'wx');
      let size = 0, signature = Buffer.alloc(0), saved = false;
      try {
        for await (const chunk of req) {
          size += chunk.length;
          if (size > maxBytes) throw fail(413, 'Use a file up to 250 MB.');
          if (signature.length < 16) signature = Buffer.concat([signature, chunk.subarray(0, 16 - signature.length)]);
          await handle.writeFile(chunk);
        }
        if (size < 24 || fileType(signature) !== mime) throw fail(415, 'The file contents do not match its selected format.');
        // Do not replace a file after another admin has approved or changed it.
        const result = db.prepare("UPDATE print_requests SET file=?,mime=?,file_bytes=?,updated_at=? WHERE id=? AND status='pending' AND file IS ?")
          .run(filename, mime, size, Date.now(), request.id, request.file);
        if (!result.changes) throw fail(409, 'This request changed while uploading. Refresh and review it.');
        saved = true;
      } finally {
        await handle.close();
        if (!saved) await unlink(target).catch(() => {});
      }
      if (request.file) await unlink(resolve(filesRoot, request.file)).catch(() => {});
      json(res, 201, { request: publicRequest(get(request.id)) });
      return true;
    }
    if (admin && match[3] === 'decision' && req.method === 'POST') {
      const { action, confirmed, fileVersion } = await readBody(req);
      if (!['approve', 'decline', 'revoke'].includes(action)) throw fail(400, 'Choose approve, decline or revoke.');
      if (action === 'approve' && (request.status !== 'pending' || !request.file || confirmed !== true || fileVersion !== version(request.file))) {
        throw fail(409, 'Upload the print file, refresh and confirm it matches this request before approving.');
      }
      if (action === 'decline' && request.status !== 'pending') throw fail(409, 'Only pending requests can be declined.');
      if (action === 'revoke' && request.status !== 'approved') throw fail(409, 'Only approved access can be revoked.');
      const changed = db.prepare('UPDATE print_requests SET status=?,updated_at=? WHERE id=? AND status=? AND file IS ?')
        .run({ approve: 'approved', decline: 'declined', revoke: 'revoked' }[action], Date.now(), request.id, request.status, request.file);
      if (!changed.changes) throw fail(409, 'This request changed. Refresh it before making a decision.');
      json(res, 200, { request: publicRequest(get(request.id)) });
      return true;
    }
    if (match[3] === 'download' && req.method === 'GET') {
      if (!request.file || (user.role !== 'admin' && request.status !== 'approved')) throw fail(403, 'Your print file is not approved for download yet.');
      limit(`print-download:${user.id}`, 60);
      let file;
      try { file = await realpath(resolve(filesRoot, request.file)); } catch { throw fail(404, 'The print file is unavailable. Contact the studio.'); }
      const rel = relative(filesRoot, file);
      if (rel.startsWith('..') || isAbsolute(rel) || !formats[request.mime]) throw fail(403, 'Invalid file.');
      const info = await stat(file);
      if (!info.isFile()) throw fail(404, 'The print file is unavailable.');
      res.writeHead(200, { 'Content-Type': request.mime, 'Content-Length': info.size,
        'Content-Disposition': `attachment; filename="viana-${request.id}-${request.width}x${request.height}in${formats[request.mime]}"` });
      const stream = createReadStream(file);
      stream.on('error', () => res.destroy()); res.on('close', () => stream.destroy()); stream.pipe(res);
      return true;
    }
    throw fail(405, 'This action is not supported.');
  };
}
