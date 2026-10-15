import { readFile, writeFile, readdir } from "node:fs/promises";
const base = process.env.VITE_BASE_PATH || "/";
if (
  !base.startsWith("/") ||
  !base.endsWith("/") ||
  base.includes("..") ||
  base.includes("://")
)
  throw Error("VITE_BASE_PATH must be an absolute path ending in /.");
const assets = (await readdir("dist/assets")).map(
  (file) => base + "assets/" + file,
);
const publicFiles = [
  "",
  "index.html",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
  "manifest.webmanifest",
].map((file) => base + file);
let sw = await readFile("dist/sw.js", "utf8");
const version = assets.join(",").replace(/[^a-zA-Z0-9]/g, "");
sw = sw
  .replace(
    /const BUILD\s*=\s*['"][^'"]*['"];(?=\n|$)/,
    `const BUILD=${JSON.stringify(version)};`,
  )
  .replace(
    /const ASSETS\s*=\s*\[[\s\S]*?\];/,
    `const ASSETS=${JSON.stringify([...publicFiles, ...assets])};`,
  );
if (
  !assets.every((asset) => sw.includes(asset)) ||
  !sw.includes(JSON.stringify(version))
)
  throw Error("Service worker precache injection failed");
await writeFile("dist/sw.js", sw);
