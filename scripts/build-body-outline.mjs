// Derive a lightweight vector silhouette from our CC0 athlete, not a web image.
// Start Vite first, then: node scripts/build-body-outline.mjs
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
    "--disable-dev-shm-usage",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1350 },
  });
  await page.goto("http://127.0.0.1:4181/previews/body-outline/render.html");
  await page.waitForFunction(() => window.bodyRendered, {}, { timeout: 30000 });
  const {
    width: w,
    height: h,
    alpha: a,
  } = await page.evaluate(() => window.bodyPixels);
  await page.screenshot({
    path: "/workspace/output/midnight-bone/body-source.png",
  });
  // Trace oriented boundary edges of the binary projection. The longest loop is
  // the outside contour, including the spaces between the arms and the torso.
  const edges = new Map();
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[y * w + x] > 128;
  const edge = (x, y, u, v) => edges.set(`${x},${y}`, [u, v]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (on(x, y)) {
        if (!on(x, y - 1)) edge(x, y, x + 1, y);
        if (!on(x + 1, y)) edge(x + 1, y, x + 1, y + 1);
        if (!on(x, y + 1)) edge(x + 1, y + 1, x, y + 1);
        if (!on(x - 1, y)) edge(x, y + 1, x, y);
      }
  let longest = [];
  while (edges.size) {
    const first = edges.keys().next().value;
    let key = first,
      loop = [];
    while (edges.has(key)) {
      const [x, y] = key.split(",").map(Number);
      loop.push([x / 3, y / 3]);
      const next = edges.get(key);
      edges.delete(key);
      key = next.join(",");
      if (key === first) break;
    }
    if (loop.length > longest.length) longest = loop;
  }
  function simplify(points, tolerance = 0.32) {
    if (points.length < 3) return points;
    const [a, b] = [points[0], points.at(-1)];
    let max = 0,
      index = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i],
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        t = Math.max(
          0,
          Math.min(
            1,
            ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) /
              (dx * dx + dy * dy || 1),
          ),
        );
      const d = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
      if (d > max) {
        max = d;
        index = i;
      }
    }
    return max > tolerance
      ? [
          ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
          ...simplify(points.slice(index), tolerance),
        ]
      : [a, b];
  }
  const points = simplify([...longest, longest[0]]).map((p) =>
    p.map((n) => Math.round(n * 100) / 100),
  );
  await writeFile(
    "src/assets/body-outline.json",
    JSON.stringify({
      license: "CC0-1.0",
      source: "athlete-optimized.glb",
      viewBox: [0, 0, 360, 450],
      points,
    }) + "\n",
  );
  console.log(`Natural athlete outline: ${points.length} contour points.`);
} finally {
  await browser.close();
}
