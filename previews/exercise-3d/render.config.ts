import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  root: resolve("previews/exercise-3d"),
  base: "/",
  publicDir: false,
  build: {
    target: "es2022",
    outDir: resolve("work/poster-build"),
    emptyOutDir: true,
    rollupOptions: { input: resolve("previews/exercise-3d/render.html") },
  },
});
