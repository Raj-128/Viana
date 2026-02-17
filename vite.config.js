import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/Viana/",
  appType: "mpa",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        about: resolve(__dirname, "about.html"),
        contact: resolve(__dirname, "contact.html"),
        services: resolve(__dirname, "services.html"),
        work: resolve(__dirname, "work.html"),
        project: resolve(__dirname, "project.html")
      }
    }
  }
});
