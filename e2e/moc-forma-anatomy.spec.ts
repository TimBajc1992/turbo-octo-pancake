import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { workoutFixture } from "./workout-fixture";

async function seed(page: Page, active = false) {
  const source = workoutFixture(active);
  await page.goto("./posodobi.html");
  await page.evaluate(async (source) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("tezisce", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("state");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("state", "readwrite");
      tx.objectStore("state").put(source, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, source);
  await page.goto("./");
  await expect(page.locator(".iron-header")).toBeVisible();
  return source;
}
async function read(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("tezisce", 1);
      r.onsuccess = () => resolve(r.result);
    });
    try {
      return await new Promise<any>((resolve) => {
        const r = db.transaction("state").objectStore("state").get("current");
        r.onsuccess = () => resolve(r.result);
      });
    } finally {
      db.close();
    }
  });
}
async function library(page: Page) {
  const nav = page.locator(
    (page.viewportSize()?.width ?? 1440) < 700 ? ".iron-dock" : ".iron-rail",
  );
  await nav.getByRole("button", { name: "Vadba", exact: true }).click();
  await page.getByRole("button", { name: "Push Day", exact: true }).click();
  await page
    .getByRole("button", { name: "Knjižnica vaj", exact: true })
    .click();
}
test("the atlas exposes front/back anatomy, real history, persistent palettes, a controllable movement and accessible dialogs", async ({
  page,
}, info) => {
  const source = await seed(page);
  await library(page);
  await page.screenshot({
    path: info.outputPath("anatomy-library.png"),
    animations: "disabled",
    scale: "css",
  });
  const preview = page.getByRole("button", {
    name: "Mišice in izvedba: Bench Press",
    exact: true,
  });
  await preview.click();
  const detail = page.getByRole("dialog", {
    name: "Mišice in izvedba: Bench Press",
    exact: true,
  });
  await expect(detail.locator(".muscle-body")).toHaveCount(2);
  await expect(
    detail.locator('[data-muscle-region="chest"][data-muscle-role="primary"]'),
  ).toHaveCount(1);
  await expect(
    detail.locator(
      '[data-muscle-region="triceps"][data-muscle-role="secondary"]',
    ),
  ).toHaveCount(2);
  await expect(detail.locator(".insight-history")).toBeVisible();
  const findings = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    findings.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        failure: n.failureSummary,
      })),
    })),
  ).toEqual([]);
  expect(await detail.evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: info.outputPath("anatomy-copper.png"),
    animations: "disabled",
    scale: "css",
  });
  await detail.getByRole("button", { name: "Prsi", exact: true }).click();
  await expect(
    detail.getByText("Pectoralis major", { exact: true }),
  ).toBeVisible();
  await expect(detail.locator('[data-muscle-region="chest"]')).toHaveAttribute(
    "opacity",
    "1",
  );
  await expect(
    detail.locator('[data-muscle-region="front-deltoids"]').first(),
  ).toHaveAttribute("opacity", "0.22");
  await detail
    .getByRole("button", { name: "Pokaži vse sodelujoče mišice", exact: true })
    .click();
  for (const palette of ["Bron in oljka", "Jeklo in modrina"]) {
    await detail.getByRole("button", { name: palette, exact: true }).click();
    await expect(
      detail.getByRole("button", { name: palette, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({
      path: info.outputPath(
        palette === "Bron in oljka" ? "anatomy-olive.png" : "anatomy-blue.png",
      ),
      animations: "disabled",
      scale: "css",
    });
  }
  await detail.getByRole("button", { name: "Izvedba", exact: true }).click();
  await detail
    .getByRole("button", { name: "Predvajaj gib", exact: true })
    .click();
  await expect(
    detail.getByRole("button", { name: "Ustavi gib", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await detail
    .getByRole("button", { name: "02 Zaključek", exact: true })
    .click();
  await expect(
    detail.getByRole("button", { name: "02 Zaključek", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: info.outputPath("exercise-movement.png"),
    animations: "disabled",
    scale: "css",
  });
  await page.keyboard.press("Escape");
  await expect(detail).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "Knjižnica vaj", exact: true }),
  ).toBeVisible();
  await expect(preview).toBeFocused();
  expect((await read(page)).workouts).toEqual(source.workouts);
  await page.reload();
  await library(page);
  await page
    .getByRole("button", {
      name: "Mišice in izvedba: Bench Press",
      exact: true,
    })
    .click();
  await expect(detail).toHaveAttribute("data-anatomy-palette", "blue");
  expect((await read(page)).workouts).toEqual(source.workouts);
});
test("the active workout anatomy works offline and respects reduced motion without changing completed sets", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const source = await seed(page, true);
  const inspect = page
    .locator(".focus-exercise")
    .getByRole("button", { name: /^Mišice in izvedba:/ });
  await expect(inspect).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await inspect.click();
  const detail = page.locator(".exercise-insight-dialog");
  await expect(detail.locator(".muscle-body")).toHaveCount(2);
  await detail.getByRole("button", { name: "Izvedba", exact: true }).click();
  await expect(
    detail.getByRole("button", { name: "Predvajaj gib", exact: true }),
  ).toHaveCount(0);
  await detail
    .getByRole("button", { name: "02 Zaključek", exact: true })
    .click();
  await expect(
    detail.getByRole("button", { name: "02 Zaključek", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(await read(page)).toEqual(source);
  await detail
    .getByRole("button", { name: "Zapri prikaz mišic", exact: true })
    .click();
  await context.setOffline(false);
});
