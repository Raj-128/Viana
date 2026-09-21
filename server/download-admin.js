import { writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

export function createDownloadAdmin({ db, filesRoot, sessionUser, readBody, json, fail, limit }) {
  db.exec(`CREATE TABLE IF NOT EXISTS download_requests (
    user_id TEXT NOT NULL REFERENCES users(id), design_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', updated_at INTEGER NOT NULL,
    PRIMARY KEY(user_id, design_id));`);
  const validId = (id) => typeof id === "string" && /^[a-z0-9-]{1,100}$/.test(id);
  return async (req, res, path) => {
    if (path !== "/api/download-requests" && !path.startsWith("/api/admin/")) return false;
    const user = sessionUser(req);
    if (!user) throw fail(401, "Please sign in first.");
    if (path.startsWith("/api/admin/") && user.role !== "admin") throw fail(403, "Administrator access is required.");
    if (path === "/api/download-requests") {
      if (req.method === "GET") {
        const requests = db.prepare(`SELECT r.design_id, r.status, r.updated_at,
          EXISTS(SELECT 1 FROM entitlements e WHERE e.user_id=r.user_id AND e.design_id=r.design_id) AS approved
          FROM download_requests r WHERE user_id=? ORDER BY updated_at DESC`).all(user.id);
        const access = db.prepare("SELECT design_id FROM entitlements WHERE user_id=?").all(user.id);
        json(res, 200, { requests, access });
      } else {
        limit(`request:${user.id}`, 20);
        const { designId } = await readBody(req);
        if (!validId(designId)) throw fail(400, "Choose a valid design.");
        const approved = Boolean(db.prepare("SELECT 1 FROM entitlements WHERE user_id=? AND design_id=?").get(user.id, designId));
        db.prepare(`INSERT INTO download_requests VALUES (?,?,?,?) ON CONFLICT(user_id,design_id)
          DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at`).run(user.id, designId, approved ? "approved" : "pending", Date.now());
        json(res, 200, { status: approved ? "approved" : "pending" });
      }
      return true;
    }
    if (path === "/api/admin/downloads" && req.method === "GET") {
      const requests = db.prepare(`SELECT r.*, u.name, u.email FROM download_requests r
        JOIN users u ON u.id=r.user_id ORDER BY r.updated_at DESC`).all();
      const customers = db.prepare("SELECT id,name,email FROM users WHERE role='user' ORDER BY name").all();
      const designs = db.prepare("SELECT id FROM designs ORDER BY id").all();
      const access = db.prepare(`SELECT e.user_id, e.design_id, u.email, u.name FROM entitlements e
        JOIN users u ON u.id=e.user_id ORDER BY u.email`).all();
      json(res, 200, { requests, customers, designs, access });
      return true;
    }
    const upload = path.match(/^\/api\/admin\/originals\/([a-z0-9-]{1,100})$/);
    if (upload && req.method === "POST") {
      limit(`upload:${user.id}`, 30);
      const designId = upload[1];
      if (db.prepare("SELECT 1 FROM designs WHERE id=?").get(designId)) throw fail(409, "An original is already stored for this design. It will not be overwritten.");
      const maxSize = 25 * 1024 * 1024;
      if (Number(req.headers["content-length"]) > maxSize) throw fail(413, "Use an image no larger than 25 MB.");
      let size = 0; const chunks = [];
      for await (const chunk of req) { size += chunk.length; if (size > maxSize) throw fail(413, "Use an image no larger than 25 MB."); chunks.push(chunk); }
      const bytes = Buffer.concat(chunks);
      const mime = req.headers["content-type"]?.split(";")[0];
      let extension;
      if (mime === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) extension = ".png";
      if (mime === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) extension = ".jpg";
      if (mime === "image/webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") extension = ".webp";
      if (!extension || bytes.length < 24) throw fail(415, "Upload a JPG, PNG or WebP image. The file type must match its contents.");
      const file = `${randomUUID()}${extension}`;
      const target = resolve(filesRoot, file);
      await writeFile(target, bytes, { flag: "wx" });
      try { db.prepare("INSERT INTO designs VALUES (?,?)").run(designId, file); }
      catch (error) { await unlink(target); throw error; }
      json(res, 201, { designId });
      return true;
    }
    if (path === "/api/admin/download-access" && req.method === "POST") {
      const { email, designId, action } = await readBody(req);
      if (!validId(designId) || !["grant", "revoke", "reject"].includes(action)) throw fail(400, "Choose a design and valid action.");
      const customer = db.prepare("SELECT id FROM users WHERE email=? AND role='user'").get(String(email || "").trim().toLowerCase());
      if (!customer) throw fail(404, "The customer must register first.");
      if (action === "grant" && !db.prepare("SELECT 1 FROM designs WHERE id=?").get(designId)) throw fail(409, "Upload the clean original before approving access.");
      db.exec("BEGIN IMMEDIATE");
      try {
        if (action === "grant") db.prepare("INSERT OR IGNORE INTO entitlements VALUES (?,?)").run(customer.id, designId);
        else db.prepare("DELETE FROM entitlements WHERE user_id=? AND design_id=?").run(customer.id, designId);
        const status = { grant: "approved", revoke: "revoked", reject: "rejected" }[action];
        db.prepare(`INSERT INTO download_requests VALUES (?,?,?,?) ON CONFLICT(user_id,design_id)
          DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at`).run(customer.id, designId, status, Date.now());
        db.exec("COMMIT");
      } catch (error) { db.exec("ROLLBACK"); throw error; }
      json(res, 200, { ok: true });
      return true;
    }
    throw fail(404, "API route not found.");
  };
}
