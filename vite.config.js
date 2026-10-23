import { defineConfig } from "vite";
import { resolve } from "path";
import { apiPlugin } from "./server/vite-plugin.js";
import { wallpaperCataloguePlugin } from "./server/wallpaper-catalogue.js";
import { modelCataloguePlugin } from "./server/model-library.js";
import { devServerStatusPlugin } from './server/dev-server-status.js';
import { legacyDetailPreviewsPlugin } from './server/legacy-detail-previews.js';

import { securityHeaders, contentSecurityPolicy } from './server/security-headers.js';

export default defineConfig(({ command }) => ({
  base: "./",
  cacheDir: "node_modules/.vite-viana",
  appType: "mpa",
  server: {
    headers: securityHeaders(true), port: 5173, strictPort: true,
    // Browser profiles and live databases contain locked files on Windows.
    // Exclude their directories before the watcher attempts to traverse them.
    watch: { ignored: file => /(?:^|\/)(?:\.gsd\/evidence|\.private)(?:\/|$)/.test(file.replaceAll('\\', '/')) },
    fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.private/**", "**/.gsd/evidence/**", "**/server/**", "**/wallpapers/optimized/**", "**/wallpapers/*.jpeg"] },
  },
  preview: { headers: securityHeaders() },
  plugins: [devServerStatusPlugin(), wallpaperCataloguePlugin(), modelCataloguePlugin(), legacyDetailPreviewsPlugin(), apiPlugin(), {
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
        plans: resolve(__dirname, "plans.html"),
        login: resolve(__dirname, "login.html"),
        adminLogin: resolve(__dirname, "admin-login.html"),
        adminDownloads: resolve(__dirname, "admin-downloads.html"),
        privacy: resolve(__dirname, "privacy.html"),
        terms: resolve(__dirname, "terms.html"),
        notFound: resolve(__dirname, "404.html")
      }
    }
  }
}));
