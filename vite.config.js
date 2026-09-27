import { defineConfig } from "vite";
import { resolve } from "path";
import { apiPlugin } from "./server/vite-plugin.js";
import { wallpaperCataloguePlugin } from "./server/wallpaper-catalogue.js";

import { securityHeaders, contentSecurityPolicy } from './server/security-headers.js';

export default defineConfig(({ command }) => ({
  base: "./",
  cacheDir: "node_modules/.vite-viana",
  appType: "mpa",
  server: { headers: securityHeaders(true), port: 5173, strictPort: true, fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.private/**", "**/server/**", "**/wallpapers/optimized/**", "**/wallpapers/*.jpeg"] } },
  preview: { headers: securityHeaders() },
  plugins: [wallpaperCataloguePlugin(), apiPlugin(), {
    name: "baseline-security-meta",
    transformIndexHtml() {
      return [
        { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: contentSecurityPolicy({ development: command === "serve", frameAncestors: false }) }, injectTo: "head-prepend" },
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
        adminLogin: resolve(__dirname, "admin-login.html"),
        adminDownloads: resolve(__dirname, "admin-downloads.html")
      }
    }
  }
}));
