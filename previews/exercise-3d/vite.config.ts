import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  root: resolve("previews/exercise-3d"),
  base: "/turbo-octo-pancake/predogled-3d/v2/",
  publicDir: false,
  build: { outDir: resolve("work/preview-3d-build"), emptyOutDir: true },
});
