import { expect, test, type Page } from "@playwright/test";
import { localDate, type State } from "../src/model";
import { readWorkoutState, workoutFixture } from "./workout-fixture";

async function seed(page: Page, source: State) {
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
        { opaque: "palette-device-key" },
        "device:sync",
      );
      tx.oncomplete = () => resolve();
    });
    db.close();
  }, source);
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /Živjo/ })).toBeVisible();
}
const nav = (page: Page) =>
  page
    .locator("nav:visible")
    .getByRole("button", { name: "Napredek", exact: true });

test("the measurement outline uses recorded waist data and retains the detailed chart and all existing records", async ({
  page,
}) => {
  const s = workoutFixture(false);
  s.measurements = [
    { id: "first-waist", date: "2026-09-01", kind: "waist", value: 100 },
    { id: "last-waist", date: "2026-11-01", kind: "waist", value: 90 },
    { id: "weight", date: "2026-11-01", kind: "weight", value: 84.8 },
  ];
  await seed(page, s);
  await expect(page.locator(".achievement-stamp")).toHaveCount(0);
  await nav(page).click();
  await expect(page.locator(".body-current")).toHaveAttribute(
    "data-waist-ratio",
    "0.9000",
  );
  await expect(page.locator(".body-progress")).toContainText("84,8");
  await expect(page.locator(".body-progress")).toContainText("90");
  await page.getByRole("button", { name: "Obseg pasu", exact: true }).click();
  await page.getByText("Podroben graf meritev", { exact: false }).click();
  await expect(page.getByRole("img", { name: /Graf:.*100 cm/ })).toBeVisible();
  expect(await readWorkoutState(page)).toEqual(s);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const colours = await page.evaluate(() => ({
    background: getComputedStyle(document.body).backgroundColor,
    ink: getComputedStyle(document.body).color,
  }));
  expect(colours).toEqual({
    background: "rgb(242, 238, 230)",
    ink: "rgb(31, 42, 68)",
  });
  expect(
    await page
      .getByRole("button", { name: "Dodaj meritev", exact: true })
      .evaluate((e) => ({
        background: getComputedStyle(e).backgroundColor,
        color: getComputedStyle(e).color,
      })),
  ).toEqual({ background: "rgb(31, 42, 68)", color: "rgb(242, 238, 230)" });
  expect(
    await page
      .locator(".body-measure strong")
      .first()
      .evaluate((e) => getComputedStyle(e).fontFamily),
  ).toContain("IBM Plex Mono");
});

test("gold marks an earned weekly goal while navigating remains read-only", async ({
  page,
}) => {
  const s = workoutFixture(false);
  s.profile.weeklyGoal = 1;
  s.workouts[0].date = localDate();
  await seed(page, s);
  await expect(page.locator(".achievement-stamp")).toBeVisible();
  await expect(page.locator(".achievement-stamp")).toContainText("DOSEŽEN");
  expect(
    await page
      .locator(".achievement-stamp")
      .evaluate((e) => getComputedStyle(e).borderTopColor),
  ).toBe("rgb(176, 141, 87)");
  await nav(page).click();
  await expect(page.locator(".achievement-stamp")).toHaveCount(0);
  expect(await readWorkoutState(page)).toEqual(s);
});

test("weight alone changes the same natural silhouette on progress and home without rewriting measurements", async ({
  page,
}) => {
  const s = workoutFixture(false);
  s.measurements = [
    { id: "initial-weight", date: "2026-09-01", kind: "weight", value: 100 },
    { id: "current-weight", date: "2026-11-01", kind: "weight", value: 80 },
  ];
  await seed(page, s);
  const homePath = await page
    .locator(".body-current > path")
    .first()
    .getAttribute("d");
  await nav(page).click();
  await expect(page.locator(".body-current")).toHaveAttribute(
    "data-weight-ratio",
    "0.8000",
  );
  const current = await page
    .locator(".body-current > path")
    .first()
    .getAttribute("d");
  expect(current).toBe(homePath);
  expect(current).not.toBe(
    await page.locator(".body-baseline").getAttribute("d"),
  );
  await expect(page.locator(".body-progress-note")).toHaveText(
    "Shematski obris sledi spremembi telesne teže.",
  );
  expect(await readWorkoutState(page)).toEqual(s);
});
