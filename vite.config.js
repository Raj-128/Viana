import { defineConfig } from "vite";
import { resolve } from "path";
import { apiPlugin } from "./server/vite-plugin.js";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
};

export default defineConfig({
  base: "./",
  cacheDir: "node_modules/.vite-viana",
  appType: "mpa",
  server: { headers: securityHeaders, port: 5173, strictPort: true, fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.private/**", "**/server/**"] } },
  preview: { headers: securityHeaders },
  plugins: [apiPlugin(), {
    name: "baseline-security-meta",
    transformIndexHtml() {
      return [
        { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: "object-src 'none'; base-uri 'self'" }, injectTo: "head-prepend" },
        { tag: "meta", attrs: { name: "referrer", content: "strict-origin-when-cross-origin" }, injectTo: "head-prepend" },
      ];
    },
  }],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        about: resolve(__dirname, "about.html"),
        contact: resolve(__dirname, "contact.html"),
        services: resolve(__dirname, "services.html"),
        work: resolve(__dirname, "work.html"),
        project: resolve(__dirname, "project.html"),
        login: resolve(__dirname, "login.html"),
        adminLogin: resolve(__dirname, "admin-login.html")
      }
    }
  }
});
