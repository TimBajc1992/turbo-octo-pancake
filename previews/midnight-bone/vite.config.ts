import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
  root: resolve("previews/midnight-bone"),
  base: "/turbo-octo-pancake/predogled-videz/v2/",
  plugins: [react()],
  publicDir: false,
  build: { outDir: resolve("work/design-preview-build"), emptyOutDir: true },
});
