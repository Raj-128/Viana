import { createServer } from "node:http";
import { createReadStream, realpathSync } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, relative, isAbsolute, extname } from "node:path";
import { createApi } from "./api.js";

if (process.env.NODE_ENV === "production" && !process.env.APP_ORIGIN?.startsWith("https://")) throw new Error("Set APP_ORIGIN to your HTTPS website origin in production.");
const root = realpathSync(resolve("dist"));
const api = createApi();
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  api.handler(req, res, async () => {
    try {
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
server.listen(Number(process.env.PORT || 3000), process.env.HOST || "127.0.0.1", () => console.log(`Studio Viana server: http://${process.env.HOST || "127.0.0.1"}:${process.env.PORT || 3000}`));
server.on("close", () => api.close());
