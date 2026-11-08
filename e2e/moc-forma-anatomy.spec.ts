import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readWorkoutState, workoutFixture } from "./workout-fixture";

async function seed(page: Page) {
  const source = workoutFixture();
  await page.goto("./posodobi.html");
  await page.evaluate(async (source) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("tezisce", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("state");
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("state", "readwrite");
      tx.objectStore("state").put(source, "current");
      tx.objectStore("state").put(
        { opaque: "anatomy-device-key-sentinel" },
        "device:sync",
      );
      tx.oncomplete = () => resolve();
    });
    db.close();
  }, source);
  await page.goto("./");
  await expect(page.locator(".focus-exercise")).toBeVisible();
  return source;
}

test("muscle roles, touch controls and offline movement guide preserve the entire existing workout", async ({
  page,
  context,
}, info) => {
  const source = await seed(page);
  await page
    .getByText("Mišice, izvedba in podlaga teže", { exact: true })
    .click();
  const guide = page.locator("section.exercise-visual");
  await expect(
    guide.getByRole("img", { name: /Bench Press: 3D prikaz/ }),
  ).toBeVisible();
  await guide.getByRole("button", { name: "Mišice", exact: true }).click();
  await expect(
    guide.getByRole("img", { name: /Bench Press: mišice pri vaji/ }),
  ).toBeVisible();
  await expect(
    guide.locator('[data-muscle="chest"][data-activation="primary"]'),
  ).toHaveCount(2);
  await expect(
    guide.locator('[data-muscle="triceps"][data-activation="secondary"]'),
  ).toHaveCount(2);
  await guide.getByRole("button", { name: "Triceps", exact: true }).click();
  await expect(
    guide.getByRole("button", { name: "Triceps", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(guide.locator(".anatomy-explanation")).toContainText(
    "izteguje komolec",
  );
  await guide.screenshot({ path: info.outputPath("anatomy-bench.png") });

  const accessibility = await new AxeBuilder({ page })
    .include("section.exercise-visual")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.failureSummary),
    })),
  ).toEqual([]);
  await guide.getByRole("button", { name: "Izvedba", exact: true }).click();
  const renderer = guide.locator(".exercise-3d-stage");
  await expect(renderer).not.toHaveAttribute("data-renderer", "loading");
  const slider = guide.getByRole("slider", {
    name: "Položaj giba",
    exact: true,
  });
  await expect(slider).toHaveValue("0");
  const animated = (await renderer.getAttribute("data-renderer")) === "webgl";
  if (process.env.TEST_BROWSER !== "webkit") expect(animated).toBe(true);
  if (animated) {
    await guide
      .getByRole("button", { name: "Predvajaj prikaz gibanja", exact: true })
      .click();
    await expect
      .poll(async () => Number(await slider.inputValue()), { timeout: 20000 })
      .toBeGreaterThan(4);
    await guide
      .getByRole("button", { name: "Ustavi prikaz gibanja", exact: true })
      .click();
    await guide
      .getByRole("button", { name: "02 · Zaključek", exact: true })
      .click();
    await expect(slider).toHaveValue("100");
    await guide
      .getByRole("button", { name: "Vrni gib na začetek", exact: true })
      .click();
    await expect(slider).toHaveValue("0");
  } else {
    await expect(guide.locator(".exercise-3d-poster")).toBeVisible();
    await expect(slider).toBeDisabled();
  }
  await guide.screenshot({ path: info.outputPath("movement-bench.png") });
  const movementAccessibility = await new AxeBuilder({ page })
    .include("section.exercise-visual")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(movementAccessibility.violations.map((v) => v.id)).toEqual([]);

  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(await readWorkoutState(page)).toEqual(source);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".focus-exercise")).toBeVisible();
  await page
    .getByText("Mišice, izvedba in podlaga teže", { exact: true })
    .click();
  await expect(
    guide.getByRole("img", { name: /Bench Press: 3D prikaz/ }),
  ).toBeVisible();
  expect(await readWorkoutState(page)).toEqual(source);
  expect(
    await page.evaluate(async () => {
      const r = indexedDB.open("tezisce", 1);
      return new Promise((resolve) => {
        r.onsuccess = () => {
          const db = r.result;
          const q = db
            .transaction("state")
            .objectStore("state")
            .get("device:sync");
          q.onsuccess = () => {
            resolve(q.result);
            db.close();
          };
        };
      });
    }),
  ).toEqual({ opaque: "anatomy-device-key-sentinel" });
});

test("a catalogue thumbnail opens the correct guide without selecting or adding an exercise", async ({
  page,
}, info) => {
  const source = await seed(page);
  await page.getByRole("button", { name: "Dodaj vajo", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Knjižnica vaj",
    exact: true,
  });
  await dialog.getByLabel("Poišči vajo", { exact: true }).fill("Leg Extension");
  const card = dialog.locator(".library-card").filter({
    has: page.getByRole("heading", { name: "Leg Extension", exact: true }),
  });
  await expect(card).toHaveCount(1);
  await card
    .getByRole("button", {
      name: "Prikaži mišice in izvedbo: Leg Extension",
      exact: true,
    })
    .click();
  const visualDialog = page.getByRole("dialog", {
    name: "Prikaz vaje: Leg Extension",
    exact: true,
  });
  const guide = visualDialog.locator("section.exercise-visual");
  await expect(
    guide.getByRole("img", { name: /Leg Extension: 3D prikaz/ }),
  ).toBeVisible();
  await guide.getByRole("button", { name: "Mišice", exact: true }).click();
  await expect(
    guide.getByRole("img", { name: /Leg Extension: mišice pri vaji/ }),
  ).toBeVisible();
  await expect(
    guide.locator('[data-muscle="quads"][data-activation="primary"]'),
  ).toHaveCount(4);
  await expect(guide.getByText("Pomožne mišice", { exact: true })).toHaveCount(
    0,
  );
  await guide.screenshot({ path: info.outputPath("anatomy-legs.png") });
  expect(await readWorkoutState(page)).toEqual(source);
  await visualDialog
    .getByRole("button", { name: "Zapri prikaz vaje", exact: true })
    .click();
  await expect(
    card.getByRole("button", {
      name: "Prikaži mišice in izvedbo: Leg Extension",
      exact: true,
    }),
  ).toBeFocused();
  await dialog
    .getByRole("button", { name: "Zapri knjižnico", exact: true })
    .click();
  expect(await readWorkoutState(page)).toEqual(source);
});

test("a browser without 3D keeps the exercise poster, muscle map and all existing workout data", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      kind: string,
      ...args: any[]
    ) {
      if (
        kind === "webgl" ||
        kind === "webgl2" ||
        kind === "experimental-webgl"
      )
        return null;
      return (getContext as any).call(this, kind, ...args);
    } as any;
  });
  const source = await seed(page);
  await page
    .getByText("Mišice, izvedba in podlaga teže", { exact: true })
    .click();
  const guide = page.locator("section.exercise-visual");
  await guide.locator(".exercise-3d-stage").scrollIntoViewIfNeeded();
  await expect(guide.locator(".exercise-3d-stage")).toHaveAttribute(
    "data-renderer",
    "poster",
  );
  await expect(guide.locator(".exercise-3d-poster")).toBeVisible();
  await expect(
    guide.getByRole("button", {
      name: "Predvajaj prikaz gibanja",
      exact: true,
    }),
  ).toBeDisabled();
  await guide.getByRole("button", { name: "Mišice", exact: true }).click();
  await expect(
    guide.getByRole("img", { name: /Bench Press: mišice pri vaji/ }),
  ).toBeVisible();
  expect(await readWorkoutState(page)).toEqual(source);
});
