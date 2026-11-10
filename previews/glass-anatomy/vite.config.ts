import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: resolve("previews/glass-anatomy"),
  base: "/turbo-octo-pancake/predogled-anatomija/v1/",
  publicDir: false,
  plugins: [react()],
  build: {
    target: "es2022",
    outDir: resolve("work/style-preview-build"),
    emptyOutDir: true,
    rollupOptions: {
      input: [
        resolve("previews/glass-anatomy/index.html"),
        resolve("previews/glass-anatomy/body-poster.html"),
        resolve("previews/glass-anatomy/atlas-render.html"),
        resolve("previews/glass-anatomy/sample-render.html"),
      ],
    },
  },
});
