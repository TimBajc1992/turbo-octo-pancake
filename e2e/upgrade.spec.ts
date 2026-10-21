import { test, expect } from "@playwright/test";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  openTraining,
  readWorkoutState,
  seedWorkout,
  workoutFixture,
} from "./workout-fixture";

test("upgrades the actual published app and service worker without rewriting any saved data or device entries", async ({
  page,
}) => {
  const previous = process.env.PREVIOUS_RELEASE_DIR;
  test.skip(
    !previous,
    "Set PREVIOUS_RELEASE_DIR to the pinned prior Pages release; CI always supplies it.",
  );
  expect(existsSync(path.resolve(previous!, "index.html"))).toBe(true);
  let next = false;
  const base = "/turbo-octo-pancake/";
  const oldDir = path.resolve(previous!),
    newDir = path.resolve("dist");
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".webmanifest": "application/manifest+json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
  };
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url || "/", "http://localhost").pathname,
      );
      if (!pathname.startsWith(base)) {
        res.writeHead(404).end();
        return;
      }
      const relative = pathname.slice(base.length) || "index.html";
      let file = path.resolve(next ? newDir : oldDir, relative);
      if (!file.startsWith((next ? newDir : oldDir) + path.sep)) {
        res.writeHead(404).end();
        return;
      }
      let data: Buffer;
      try {
        data = await fs.readFile(file);
      } catch (error) {
        if (!next || !relative.startsWith("assets/")) throw error;
        file = path.resolve(oldDir, relative);
        data = await fs.readFile(file);
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(data);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}${base}`;
  try {
    const original = workoutFixture();
    await seedWorkout(page, original, url);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await openTraining(page);
    await expect(page.locator(".focus-exercise")).toHaveCount(0);
    const sentinel = {
      pairing: "synthetic-device-entry-preserved",
      secret: "not-a-real-key",
      at: 123,
    };
    await page.evaluate(
      async (sentinel) =>
        new Promise<void>((resolve) => {
          const r = indexedDB.open("tezisce", 1);
          r.onsuccess = () => {
            const tx = r.result.transaction("state", "readwrite");
            tx.objectStore("state").put(sentinel, "device:sync");
            tx.oncomplete = () => {
              r.result.close();
              resolve();
            };
          };
        }),
      sentinel,
    );
    expect(await readWorkoutState(page)).toEqual(original);
    next = true;
    await page.goto(url + "posodobi.html");
    await page
      .getByRole("button", { name: "Posodobi in odpri TEŽIŠČE", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: /Tvoj tempo/ })).toBeVisible(
      { timeout: 45000 },
    );
    await openTraining(page);
    await expect(
      page.getByRole("button", { name: "Vse serije", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".focus-exercise")).toHaveCount(1);
    expect(await readWorkoutState(page)).toEqual(original);
    const stored = await page.evaluate(
      () =>
        new Promise<{ version: number; value: unknown }>((resolve) => {
          const r = indexedDB.open("tezisce", 1);
          r.onsuccess = () => {
            const q = r.result
              .transaction("state")
              .objectStore("state")
              .get("device:sync");
            q.onsuccess = () => {
              resolve({ version: r.result.version, value: q.result });
              r.result.close();
            };
          };
        }),
    );
    expect(stored).toEqual({ version: 1, value: sentinel });
  } finally {
    if (!page.isClosed())
      await page.goto("about:blank", { timeout: 2000 }).catch(() => {});
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
