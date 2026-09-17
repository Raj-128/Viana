import { DatabaseSync } from "node:sqlite";
import { mkdirSync, realpathSync, createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, relative, isAbsolute, extname } from "node:path";
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const phone = (value = "") => { const digits = String(value).replace(/\D/g, ""); return digits.length === 10 ? `91${digits}` : digits; };
const safeUser = ({ id, name, email, phone, role }) => ({ id, name, email, phone, role });
const types = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif" };

export function createApi({ dataDir = resolve(".private"), origin = process.env.APP_ORIGIN, secureCookies = process.env.NODE_ENV === "production" } = {}) {
  mkdirSync(resolve(dataDir, "files"), { recursive: true });
  const filesRoot = realpathSync(resolve(dataDir, "files"));
  const db = new DatabaseSync(resolve(dataDir, "studio.sqlite"), { timeout: 5000 });
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT UNIQUE NOT NULL, role TEXT NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS designs (id TEXT PRIMARY KEY, file TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS entitlements (user_id TEXT NOT NULL REFERENCES users(id), design_id TEXT NOT NULL REFERENCES designs(id), PRIMARY KEY(user_id,design_id));
    CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);`);
  const fail = (status, message) => Object.assign(new Error(message), { status });
  const json = (res, status, value) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(value)); };
  const cookie = (req) => req.headers.cookie?.match(/(?:^|;\s*)viana_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  const setCookie = (res, token, maxAge) => res.setHeader("Set-Cookie", `viana_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secureCookies ? "; Secure" : ""}`);
  const sessionUser = (req) => {
    const token = cookie(req);
    return token ? db.prepare("SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>?").get(hash(token), Date.now()) : null;
  };
  const startSession = (req, res, user) => {
    if (cookie(req)) db.prepare("DELETE FROM sessions WHERE token=?").run(hash(cookie(req)));
    db.prepare("DELETE FROM sessions WHERE expires<=?").run(Date.now());
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(hash(token), user.id, Date.now() + 86400000);
    setCookie(res, token, 86400);
  };
  const limit = (key, maximum) => {
    const now = Date.now();
    db.prepare("DELETE FROM limits WHERE expires<=?").run(now);
    db.prepare("INSERT INTO limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1").run(key, now + 900000);
    if (db.prepare("SELECT count FROM limits WHERE key=?").get(key).count > maximum) throw fail(429, "Too many requests. Try again in 15 minutes.");
  };
  const readBody = async (req) => {
    if (!req.headers["content-type"]?.startsWith("application/json")) throw fail(415, "JSON is required.");
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 8192) throw fail(413, "Request is too large."); chunks.push(chunk); }
    try { const data = JSON.parse(Buffer.concat(chunks).toString()); if (!data || Array.isArray(data) || typeof data !== "object") throw new Error(); return data; }
    catch { throw fail(400, "Invalid request."); }
  };
  async function createUser(data, role = "user") {
    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const normalizedPhone = phone(data.phone);
    const password = typeof data.password === "string" ? data.password : "";
    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !/^\d{10,15}$/.test(normalizedPhone)) throw fail(400, "Enter a valid name, email and phone number.");
    if (password.length < 10 || password.length > 128 || !/[a-z]/i.test(password) || !/\d/.test(password)) throw fail(400, "Password must contain letters and numbers and be 10–128 characters.");
    if (role === "user" && (email === "vickyranagovind@gmail.com" || normalizedPhone === "919737711570")) throw fail(400, "This contact is reserved for the studio owner.");
    const salt = randomBytes(16).toString("hex");
    const derived = await derive(password, salt, 64);
    const user = { id: randomUUID(), name, email, phone: normalizedPhone, role };
    try { db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?)").run(user.id, name, email, normalizedPhone, role, salt, derived.toString("hex")); }
    catch (error) { if (error.code?.startsWith("ERR_SQLITE")) throw fail(409, "An account with those details already exists."); throw error; }
    return user;
  }
  async function handler(req, res, next = () => { res.writeHead(404); res.end(); }) {
    const path = new URL(req.url, "http://localhost").pathname;
    if (!path.startsWith("/api/")) return next();
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    try {
      if (!["GET", "POST"].includes(req.method)) throw fail(405, "Method not allowed.");
      if (req.method === "POST") {
        const expectedOrigin = origin || `${req.socket.encrypted ? "https" : "http"}://${req.headers.host}`;
        if (req.headers.origin !== expectedOrigin || req.headers["sec-fetch-site"] === "cross-site") throw fail(403, "Request origin is not allowed.");
      }
      if (path === "/api/health" && req.method === "GET") return json(res, 200, { ok: true });
      if (path === "/api/auth/session" && req.method === "GET") {
        const user = sessionUser(req);
        return json(res, 200, { user: user ? safeUser(user) : null, adminConfigured: Boolean(db.prepare("SELECT 1 FROM users WHERE role='admin'").get()) });
      }
      if (path === "/api/auth/logout" && req.method === "POST") {
        if (cookie(req)) db.prepare("DELETE FROM sessions WHERE token=?").run(hash(cookie(req)));
        setCookie(res, "", 0);
        return json(res, 200, { user: null });
      }
      if (["/api/auth/register", "/api/auth/login", "/api/auth/admin-login"].includes(path) && req.method === "POST") {
        limit(`auth:${req.socket.remoteAddress}`, 30);
        const data = await readBody(req);
        let user;
        if (path.endsWith("register")) {
          if (data.password !== data.confirmPassword) throw fail(400, "Passwords do not match.");
          user = await createUser(data);
        } else {
          const identifier = String(data.identifier || "").trim().toLowerCase();
          if (!identifier || identifier.length > 254 || typeof data.password !== "string" || data.password.length > 128) throw fail(400, "Enter your email or phone and password.");
          const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
          const validPhone = /^[+\d\s()-]+$/.test(identifier) && /^\d{10,15}$/.test(phone(identifier));
          if (!validEmail && !validPhone) throw fail(400, "Enter your registered email address or phone number. A name cannot be used to sign in.");
          if (!db.prepare("SELECT 1 FROM users LIMIT 1").get()) throw fail(409, "No accounts have been created on this server yet. Register a customer account, or create the owner account using npm run server:admin in the project terminal.");
          limit(`login:${hash(identifier)}`, 10);
          user = db.prepare("SELECT * FROM users WHERE email=? OR phone=?").get(identifier, phone(identifier));
          const derived = await derive(data.password, user?.salt || "unknown-account-salt", 64);
          if (!user || !timingSafeEqual(derived, Buffer.from(user.password, "hex"))) throw fail(401, "Incorrect account or password.");
          if (path === "/api/auth/admin-login" && user.role !== "admin") {
            throw fail(403, "This login is for studio administrators. Use the customer login page.");
          }
        }
        startSession(req, res, user);
        return json(res, 200, { user: safeUser(user) });
      }
      const match = path.match(/^\/api\/designs\/([a-z0-9-]+)\/download$/);
      if (match && req.method === "GET") {
        const user = sessionUser(req);
        if (!user) throw fail(401, "Please sign in.");
        limit(`download:${user.id}`, 60);
        if (user.role !== "admin" && !db.prepare("SELECT 1 FROM entitlements WHERE user_id=? AND design_id=?").get(user.id, match[1])) throw fail(403, "Download access has not been granted.");
        const design = db.prepare("SELECT file FROM designs WHERE id=?").get(match[1]);
        if (!design) throw fail(404, "This file has not been uploaded yet.");
        let file;
        try { file = realpathSync(resolve(filesRoot, design.file)); } catch { throw fail(404, "File is unavailable."); }
        const relativeFile = relative(filesRoot, file);
        if (relativeFile.startsWith("..") || isAbsolute(relativeFile) || !types[extname(file).toLowerCase()]) throw fail(403, "Invalid file.");
        const info = await stat(file);
        if (!info.isFile()) throw fail(404, "File is unavailable.");
        res.writeHead(200, { "Content-Type": types[extname(file).toLowerCase()], "Content-Length": info.size, "Content-Disposition": `attachment; filename="${match[1]}${extname(file).toLowerCase()}"` });
        const stream = createReadStream(file);
        stream.on("error", () => res.destroy());
        res.on("close", () => stream.destroy());
        return stream.pipe(res);
      }
      throw fail(404, "API route not found.");
    } catch (error) {
      if (!res.headersSent) {
        if (error.status === 429) res.setHeader("Retry-After", "900");
        json(res, error.status || 500, { error: error.status ? error.message : "Server error. Please try again." });
      } else res.destroy();
    }
  }
  async function resetAdminPassword(identifier, password) {
    const normalized = String(identifier).trim().toLowerCase();
    const user = db.prepare("SELECT * FROM users WHERE role='admin' AND (email=? OR phone=?)").get(normalized, phone(normalized));
    if (!user) throw new Error("No admin account matches that email or phone.");
    if (typeof password !== "string" || password.length < 10 || password.length > 128 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
      throw new Error("Password must contain letters and numbers and be 10–128 characters.");
    }
    const salt = randomBytes(16).toString("hex");
    const derived = await derive(password, salt, 64);
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("UPDATE users SET salt=?, password=? WHERE id=?").run(salt, derived.toString("hex"), user.id);
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
      db.prepare("DELETE FROM limits WHERE key IN (?,?)").run(`login:${hash(user.email)}`, `login:${hash(user.phone)}`);
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  }
  return { handler, db, createUser, resetAdminPassword, filesRoot, close: () => db.close() };
}
