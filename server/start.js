import { createServer } from "node:http";
import { createReadStream, realpathSync } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, relative, isAbsolute, extname } from "node:path";
import { createApi } from "./api.js";

const defaultOrigin = process.env.APP_ORIGIN || "https://raj-128.github.io";
let root = null;
try {
  root = realpathSync(resolve("dist"));
} catch {
  // dist folder not built yet, API routes will still work
}
const api = createApi({ origin: defaultOrigin });
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  api.handler(req, res, async () => {
    try {
      if (!root) { res.writeHead(404); return res.end("Studio Viana API Server (Static frontend not built on this host)"); }
      if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405); return res.end(); }
      const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      const file = realpathSync(resolve(root, `.${path === "/" ? "/index.html" : path}`));
      const rel = relative(root, file);
      if (rel.startsWith("..") || isAbsolute(rel) || rel.split(/[\\/]/).some((part) => part.startsWith("."))) throw new Error();
      const info = await stat(file);
      if (!info.isFile()) throw new Error();
      res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream", "Content-Length": info.size });
      if (req.method === "HEAD") return res.end();
      createReadStream(file).on("error", () => res.destroy()).pipe(res);
    } catch { res.writeHead(404); res.end("Not found"); }
  });
});
async function initAdminFromEnv() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Studio Owner";
  const phone = process.env.ADMIN_PHONE || "9737711570";

  const adminExists = Boolean(api.db.prepare("SELECT 1 FROM users WHERE role='admin'").get());
  if (!adminExists && email && password) {
    try {
      await api.createUser({ name, email, phone, password }, "admin");
      console.log(`[Admin Setup] Initialized secure admin account`);
    } catch (err) {
      console.warn(`[Admin Setup] Could not auto-create admin:`, err.message);
    }
  }
}
initAdminFromEnv();

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
server.listen(port, host, () => console.log(`Studio Viana server running on http://${host}:${port}`));
server.on("close", () => api.close());

