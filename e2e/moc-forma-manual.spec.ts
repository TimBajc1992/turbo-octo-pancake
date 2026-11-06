import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { workoutFixture } from "./workout-fixture";
import { localDate, type State } from "../src/model";
async function seed(page: Page, active = true) {
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
      const tx = db.transaction("state", "readwrite"),
        s = tx.objectStore("state");
      s.clear();
      s.put(source, "current");
      s.put({ opaque: "synthetic-manual-preserve" }, "device:sync");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, source);
  await page.goto("./");
  await expect(page.locator(".iron-header")).toBeVisible();
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
function dayOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDate(d);
}
async function open(page: Page) {
  await page
    .getByRole("button", { name: /^(Naknadni vnos|Nadaljuj naknadni vnos)$/ })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Naknadni vnos treninga" }),
  ).toBeVisible();
}
async function addFromLibrary(page: Page, names: string[]) {
  await page
    .getByRole("button", { name: "Izberi iz knjižnice", exact: true })
    .click();
  for (const name of names)
    await page
      .getByRole("button", { name: `Dodaj ${name}`, exact: true })
      .click();
  await page
    .getByRole("button", { name: "Zapri knjižnico", exact: true })
    .click();
}

test("a retrospective entry survives reload, accepts actual comma loads and preserves all original history and the active workout", async ({
  page,
  context,
}, info) => {
  const source = await seed(page, true);
  await open(page);
  await page.getByLabel("Datum treninga", { exact: true }).fill(dayOffset(-2));
  await page
    .getByLabel("Ime treninga", { exact: true })
    .fill("Trening brez telefona");
  await page
    .getByLabel("Trajanje treninga v minutah", { exact: true })
    .fill("50");
  await addFromLibrary(page, ["Bench Press"]);
  const weight = page.getByLabel("Bench Press, serija 1, teža", {
    exact: true,
  });
  await expect(weight).toHaveValue("");
  await weight.pressSequentially("47,5");
  await page
    .getByLabel("Bench Press, serija 1, ponovitve", { exact: true })
    .fill("9");
  await page
    .getByLabel("Bench Press, serija 1, RIR", { exact: true })
    .fill("2");
  await page
    .getByRole("button", { name: "Dodaj enako serijo", exact: true })
    .click();
  await page
    .getByLabel("Bench Press, serija 2, ponovitve", { exact: true })
    .fill("8");
  await page
    .getByLabel("Lastna vaja", { exact: true })
    .fill("Veslanje na stari napravi");
  await page
    .getByRole("button", { name: "Dodaj lastno vajo", exact: true })
    .click();
  await page
    .getByLabel("Veslanje na stari napravi, serija 1, teža", { exact: true })
    .fill("20");
  await page
    .getByLabel("Veslanje na stari napravi, serija 1, ponovitve", {
      exact: true,
    })
    .fill("12");
  await page
    .getByLabel("Opomba treninga (neobvezno)", { exact: true })
    .fill("Vneseno doma po treningu.");
  await page
    .getByRole("button", { name: "Zapri naknadni vnos", exact: true })
    .click();
  await expect(page.locator(".iron-storage")).toHaveText("Na napravi");
  let state = (await read(page)) as State;
  expect(state.workouts).toEqual(source.workouts);
  expect(state.active).toEqual(source.active);
  expect(state.manualWorkoutDraft!.exercises[0].sets[0]).toMatchObject({
    weight: 47.5,
    reps: 9,
    done: false,
  });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await open(page);
  await expect(page.getByLabel("Ime treninga", { exact: true })).toHaveValue(
    "Trening brez telefona",
  );
  await expect(
    page.getByLabel("Bench Press, serija 1, teža", { exact: true }),
  ).toHaveValue("47.5");
  await page.screenshot({
    path: info.outputPath("manual-workout.png"),
    fullPage: true,
    animations: "disabled",
    scale: "css",
  });
  await page
    .getByRole("button", { name: "Shrani opravljeni trening", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Naknadni vnos treninga" }),
  ).toHaveCount(0);
  await expect
    .poll(async () => ((await read(page)) as State).workouts.length)
    .toBe(3);
  state = (await read(page)) as State;
  expect(state.workouts.slice(0, 2)).toEqual(source.workouts);
  expect(state.active).toEqual(source.active);
  for (const key of [
    "measurements",
    "daily",
    "cardio",
    "templates",
    "imports",
    "profile",
  ] as const)
    expect(state[key]).toEqual(source[key]);
  const record = state.workouts[2];
  expect(record).toMatchObject({
    name: "Trening brez telefona",
    date: dayOffset(-2),
    entryMode: "retrospective",
    durationMin: 50,
    reviewDuration: false,
    note: "Vneseno doma po treningu.",
  });
  expect(record.startedAt).toBeUndefined();
  expect(record.finishedAt).toBeUndefined();
  expect(
    record.exercises[0].sets.map((s) => [s.weight, s.reps, s.done]),
  ).toEqual([
    [47.5, 9, true],
    [47.5, 8, true],
  ]);
  expect(record.exercises[1].sets[0]).toMatchObject({
    weight: 20,
    reps: 12,
    done: true,
  });
  expect(state.manualWorkoutDraft).toBeUndefined();
  expect((await read(page, "moc-forma:safety:v1")).state).toEqual(source);
  expect(await read(page, "device:sync")).toEqual({
    opaque: "synthetic-manual-preserve",
  });
  await expect(
    page.getByText("Vneseno naknadno", { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
});

test("manual entry validates dates, permits actual cardio minutes and exposes accessible controls", async ({
  page,
}, info) => {
  const source = await seed(page, false);
  await nav(page)
    .getByRole("button", { name: "Zgodovina", exact: true })
    .click();
  await open(page);
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    a11y.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
  await page
    .getByLabel("Ime treninga", { exact: true })
    .fill("Tek brez telefona");
  await page
    .getByLabel("Vrsta lastne vaje", { exact: true })
    .selectOption("cardio");
  await page.getByLabel("Lastna vaja", { exact: true }).fill("Tek zunaj");
  await page
    .getByRole("button", { name: "Dodaj lastno vajo", exact: true })
    .click();
  await page
    .getByLabel("Tek zunaj, serija 1, minute", { exact: true })
    .fill("25");
  const date = page.getByLabel("Datum treninga", { exact: true });
  await date.fill(dayOffset(1));
  await page
    .getByRole("button", { name: "Shrani opravljeni trening", exact: true })
    .click();
  expect(
    await date.evaluate((e) => (e as HTMLInputElement).validity.rangeOverflow),
  ).toBe(true);
  expect(((await read(page)) as State).workouts).toEqual(source.workouts);
  await date.fill(dayOffset(-1));
  await page
    .getByRole("button", { name: "Shrani opravljeni trening", exact: true })
    .click();
  await expect
    .poll(async () => ((await read(page)) as State).workouts.length)
    .toBe(3);
  const record = ((await read(page)) as State).workouts.at(-1)!;
  expect(record.date).toBe(dayOffset(-1));
  expect(record.reviewDuration).toBe(true);
  expect(record.exercises[0]).toMatchObject({
    cardio: true,
    sets: [{ weight: 0, reps: 25, done: true, loadPending: false }],
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("retrospective library retains real past exercises beyond the preparation cap while planning still uses its limits", async ({
  page,
}) => {
  await seed(page, false);
  await nav(page)
    .getByRole("button", { name: "Zgodovina", exact: true })
    .click();
  await open(page);
  await page.getByLabel("Sklop treninga", { exact: true }).selectOption("push");
  await page
    .getByRole("button", { name: "Izberi iz knjižnice", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Leg Press", exact: true }),
  ).toHaveCount(0);
  for (const name of ["Bench Press", "Incline Bench Press"])
    await page
      .getByRole("button", { name: `Dodaj ${name}`, exact: true })
      .click();
  await expect(
    page.getByRole("button", { name: "Dodaj Pec Deck", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Dodaj Pec Deck", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Zapri knjižnico", exact: true })
    .click();
  expect(
    ((await read(page)) as State).manualWorkoutDraft!.exercises,
  ).toHaveLength(3);
  await page
    .getByRole("button", { name: "Zapri naknadni vnos", exact: true })
    .click();
  await nav(page).getByRole("button", { name: "Vadba", exact: true }).click();
  await page.getByRole("button", { name: "Push Day", exact: true }).click();
  await page
    .getByRole("button", { name: "Knjižnica vaj", exact: true })
    .click();
  for (const name of ["Bench Press", "Incline Bench Press"])
    await page
      .getByRole("button", { name: `Dodaj ${name}`, exact: true })
      .click();
  await expect(
    page.getByRole("button", { name: "Dodaj Pec Deck", exact: true }),
  ).toBeDisabled();
});
