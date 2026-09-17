import { createApi } from "./api.js";

export function apiPlugin() {
  function attach(server) {
    const api = createApi();
    server.middlewares.use((req, res, next) => {
      let path;
      try { path = decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(/\\/g, "/"); }
      catch { res.writeHead(400); return res.end("Bad request"); }
      if (/(?:^|\/)\.private(?:\/|$)/i.test(path)) {
        res.writeHead(403, { "Content-Type": "text/plain", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
        return res.end("Forbidden");
      }
      next();
    });
    server.middlewares.use(api.handler);
    server.httpServer?.once("close", () => api.close());
  }
  return { name: "studio-api", configureServer: attach, configurePreviewServer: attach };
}
