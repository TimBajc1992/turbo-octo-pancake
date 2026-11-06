import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { workoutFixture } from "./workout-fixture";
import type { State } from "../src/model";

async function seed(page: Page, source = workoutFixture(false)) {
  await page.goto("./posodobi.html");
  await page.evaluate(async (state) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("tezisce", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("state");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("state", "readwrite"),
        store = tx.objectStore("state");
      store.clear();
      store.put(state, "current");
      store.put({ opaque: "synthetic-connection-preserve" }, "device:sync");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, source);
  await page.goto("./");
  await expect(
    page.getByRole(
      "heading",
      source.active
        ? { name: source.active.name, exact: true }
        : { name: /Živjo/ },
    ),
  ).toBeVisible();
  return source;
}
async function read(page: Page, key = "current"): Promise<any> {
  return page.evaluate(async (key) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("tezisce", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const r = db.transaction("state").objectStore("state").get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  }, key);
}
function nav(page: Page) {
  return page.locator(
    (page.viewportSize()?.width ?? 1440) < 700 ? ".iron-dock" : ".iron-rail",
  );
}
async function training(page: Page) {
  await nav(page).getByRole("button", { name: "Vadba", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tvoja vadba.", exact: true }),
  ).toBeVisible();
}
function card(page: Page, name: string) {
  return page
    .locator(".library-card")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
}

test("existing history, complete metadata, active workout and device keys survive the new interface", async ({
  page,
}, info) => {
  const source = await seed(page, workoutFixture(true));
  expect(await read(page)).toEqual(source);
  expect((await read(page, "moc-forma:safety:v1")).state).toEqual(source);
  expect(await read(page, "device:sync")).toEqual({
    opaque: "synthetic-connection-preserve",
  });
  await nav(page)
    .getByRole("button", { name: "Zgodovina", exact: true })
    .click();
  await expect(
    page.getByText("Obstoječi trening", { exact: true }).first(),
  ).toBeVisible();
  expect(await read(page)).toEqual(source);
  await nav(page).getByRole("button", { name: "Vadba", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Trening v teku pred posodobitvijo",
      exact: true,
    }),
  ).toBeVisible();
  expect(await read(page)).toEqual(source);
  await page.screenshot({
    path: info.outputPath("preserved-active.png"),
    fullPage: true,
  });
  const activeAccessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    activeAccessibility.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
});

test("filtered library enforces two exercises per primary muscle, preserves drafts and warns about missing groups", async ({
  page,
}) => {
  const source = await seed(page);
  await training(page);
  await page.getByRole("button", { name: "Push Day", exact: true }).click();
  await expect(page.locator(".muscle-group")).toHaveCount(3);
  await expect(page.locator('.muscle-group[aria-label="Prsi"]')).toContainText(
    "0 / 2",
  );
  await page
    .getByRole("button", { name: "Knjižnica vaj", exact: true })
    .click();
  await expect(card(page, "Leg Press")).toHaveCount(0);
  await expect(card(page, "Seated Cable Row")).toHaveCount(0);
  await expect(card(page, "Reverse Pec Deck")).toHaveCount(0);
  await card(page, "Bench Press")
    .getByRole("button", { name: "Dodaj Bench Press", exact: true })
    .click();
  await expect(
    card(page, "Bench Press").getByRole("button", {
      name: "Odstrani Bench Press",
      exact: true,
    }),
  ).toBeVisible();
  await card(page, "Incline Bench Press")
    .getByRole("button", { name: "Dodaj Incline Bench Press", exact: true })
    .click();
  await expect(
    card(page, "Pec Deck").getByRole("button", {
      name: "Dodaj Pec Deck",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Zapri knjižnico", exact: true })
    .click();
  await expect(page.locator('.muscle-group[aria-label="Prsi"]')).toContainText(
    "2 / 2",
  );
  await expect(
    page.getByRole("button", { name: "Začni vadbo", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".missing-groups")).toContainText(
    "Ramena · Triceps",
  );
  await page
    .getByRole("checkbox", { name: "Danes te skupine zavestno izpustim." })
    .check();
  await expect(
    page.getByRole("button", { name: "Začni vadbo", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Pull Day", exact: true }).click();
  await expect(page.locator(".selected-exercises li")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Knjižnica vaj", exact: true })
    .click();
  await expect(card(page, "Bench Press")).toHaveCount(0);
  await expect(card(page, "Reverse Pec Deck")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Zapri knjižnico", exact: true })
    .click();
  await page.getByRole("button", { name: "Push Day", exact: true }).click();
  await expect(page.locator(".selected-exercises li")).toHaveCount(2);
  await expect(page.locator(".iron-storage")).toHaveText("Na napravi");
  await page.reload();
  await training(page);
  await expect(
    page.getByRole("button", { name: "Push Day", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".selected-exercises li")).toHaveCount(2);
  expect(((await read(page)) as State).workouts).toEqual(source.workouts);
  expect((await read(page, "moc-forma:safety:v1")).state).toEqual(source);
});

test("a complete chosen Push Day logs sets, resumes offline and retains the original Težišče workouts", async ({
  page,
  context,
}) => {
  const source = await seed(page);
  await training(page);
  await page.getByRole("button", { name: "Push Day", exact: true }).click();
  await page
    .getByRole("button", { name: "Knjižnica vaj", exact: true })
    .click();
  for (const name of [
    "Bench Press",
    "Dumbbell Shoulder Press",
    "Cable Triceps Pushdown",
  ])
    await card(page, name)
      .getByRole("button", { name: `Dodaj ${name}`, exact: true })
      .click();
  await page
    .getByRole("button", { name: "Zapri knjižnico", exact: true })
    .click();
  await expect(page.locator(".missing-groups")).toHaveCount(0);
  await page.getByRole("button", { name: "Začni vadbo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Push Day", exact: true }),
  ).toBeVisible();
  let active = ((await read(page)) as State).active!;
  expect(active.exercises.map((e) => e.id)).toEqual([
    "bench_press",
    "dumbbell_shoulder_press",
    "tricep_pushdown",
  ]);
  expect(active.exercises.flatMap((e) => e.sets).every((s) => !s.done)).toBe(
    true,
  );
  await page
    .getByLabel("Teža serije 1 Bench Press", { exact: true })
    .fill("47.5");
  await page
    .getByLabel("Ponovitve serije 1 Bench Press", { exact: true })
    .fill("9");
  await page
    .getByRole("button", { name: "Potrdi serijo 1 Bench Press", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        ((await read(page)) as State).active!.exercises[0].sets[0].done,
    )
    .toBe(true);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Push Day", exact: true }),
  ).toBeVisible();
  active = ((await read(page)) as State).active!;
  expect(active.exercises[0].sets[0]).toMatchObject({
    weight: 47.5,
    reps: 9,
    done: true,
  });
  await page
    .getByRole("button", { name: "Zaključi trening", exact: true })
    .click();
  await expect
    .poll(async () => ((await read(page)) as State).workouts.length)
    .toBe(3);
  const after = (await read(page)) as State;
  expect(after.workouts.slice(0, 2)).toEqual(source.workouts);
  expect(after.active).toBeUndefined();
  await context.setOffline(false);
});

test("new screens and library fit the viewport and expose accessible controls", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page);
  const findings: unknown[] = [];
  for (const name of ["Danes", "Vadba", "Navade", "Napredek", "Zgodovina"]) {
    await nav(page).getByRole("button", { name, exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      name,
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    if (result.violations.length)
      findings.push({
        name,
        violations: result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      });
    await page.screenshot({
      path: info.outputPath(`${name}.png`),
      fullPage: true,
      animations: "disabled",
      scale: "css",
    });
  }
  await page
    .locator(".iron-header")
    .getByRole("button", { name: "Nastavitve in profil", exact: true })
    .click();
  const settingsAccessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  if (settingsAccessibility.violations.length)
    findings.push({
      name: "settings",
      violations: settingsAccessibility.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
  await training(page);
  await page.getByRole("button", { name: "Push Day", exact: true }).click();
  await page
    .getByRole("button", { name: "Knjižnica vaj", exact: true })
    .click();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  if (result.violations.length)
    findings.push({
      name: "library",
      violations: result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
  await info.attach("accessibility", {
    body: JSON.stringify(findings, null, 2),
    contentType: "application/json",
  });
  expect(findings).toEqual([]);
  expect(errors).toEqual([]);
});
