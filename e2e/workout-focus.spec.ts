import { test, expect } from "@playwright/test";
import {
  openTraining,
  readWorkoutState,
  savedWorkout,
  seedWorkout,
  workoutFixture,
} from "./workout-fixture";

test("focused logging needs no keyboard, protects prior sets and a double tap, persists and fits a phone", async ({
  page,
}) => {
  const before = workoutFixture();
  await page.setViewportSize({ width: 390, height: 844 });
  await seedWorkout(page, before);
  await openTraining(page);
  expect(await readWorkoutState(page)).toEqual(before); // opening/upgrading is read-only
  await expect(page.locator(".focus-exercise")).toHaveCount(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  const mainAction = await page.locator(".quick-log").boundingBox();
  const navigation = await page.locator(".bottom-nav").boundingBox();
  expect(mainAction!.y + mainAction!.height).toBeLessThanOrEqual(navigation!.y);
  await expect(page.locator(".focus-reference")).toContainText(
    "45 × 10 / 45 × 10 / 40 × 10",
  );
  await page.getByRole("button", { name: "Povečaj težo", exact: true }).click();
  await page
    .getByRole("button", { name: "Povečaj ponovitve", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Potrdi serijo 2 Bench Press", exact: true })
    .dblclick({ delay: 60 });
  await savedWorkout(page);
  let after = await readWorkoutState(page);
  expect(after.active!.exercises[0].sets[0]).toEqual(
    before.active!.exercises[0].sets[0],
  );
  expect(after.active!.exercises[0].sets[1]).toMatchObject({
    weight: 32.5,
    reps: 11,
    done: true,
  });
  expect(after.active!.exercises[0].sets[2]).toMatchObject({
    weight: 32.5,
    reps: 11,
    done: false,
    loadPending: false,
  });
  for (const key of [
    "workouts",
    "measurements",
    "daily",
    "cardio",
    "templates",
    "imports",
    "profile",
    "healthBridge",
    "nextTemplate",
  ] as const)
    expect(after[key]).toEqual(before[key]);
  expect(after.restUntil).toBeGreaterThan(Date.now());
  await page.screenshot({
    path: "test-results/focus-phone.png",
    fullPage: false,
  });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.reload();
  await openTraining(page);
  expect((await readWorkoutState(page)).active).toEqual(after.active);
  await page
    .getByRole("button", {
      name: "Razveljavi serijo 2 Bench Press",
      exact: true,
    })
    .click();
  await savedWorkout(page);
  after = await readWorkoutState(page);
  expect(after.active!.exercises[0].sets.map((a) => a.done)).toEqual([
    true,
    false,
    false,
  ]);
  await page.getByRole("button", { name: "Vse serije", exact: true }).click();
  await page
    .locator(".exercise-card")
    .filter({
      has: page.getByRole("heading", { name: "Bench Press", exact: true }),
    })
    .getByRole("button", { name: "Kopiraj vrednosti", exact: true })
    .click();
  await savedWorkout(page);
  expect((await readWorkoutState(page)).active!.exercises[0].sets[0]).toEqual(
    before.active!.exercises[0].sets[0],
  );
  await page.getByRole("button", { name: "Hiter pogled", exact: true }).click();
  await page.getByLabel("Teža serije 2 Bench Press", { exact: true }).fill("");
  await expect(
    page.getByRole("button", {
      name: "Potrdi serijo 2 Bench Press",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByLabel("Teža serije 2 Bench Press", { exact: true })
    .fill("35,5");
  await expect(
    page.getByRole("button", {
      name: "Potrdi serijo 2 Bench Press",
      exact: true,
    }),
  ).toBeEnabled();
});

test("catalogue search shows sketches and adds a new variant with a clearly optional estimate", async ({
  page,
}) => {
  const before = workoutFixture();
  await page.setViewportSize({ width: 390, height: 844 });
  await seedWorkout(page, before);
  await openTraining(page);
  await page.getByRole("button", { name: "Dodaj vajo", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Knjižnica vaj",
    exact: true,
  });
  await dialog.getByLabel("Poišči vajo", { exact: true }).fill("incline");
  await dialog
    .getByRole("combobox", { name: "Mišična skupina", exact: true })
    .selectOption("Prsi");
  await dialog
    .getByRole("combobox", { name: "Oprema", exact: true })
    .selectOption("dumbbell");
  await expect(dialog.locator(".library-card")).toHaveCount(1);
  await expect(
    dialog.getByRole("img", { name: /Incline Dumbbell Press/ }),
  ).toBeVisible();
  await dialog.getByText("Kako izvedem vajo?", { exact: true }).click();
  await expect(dialog).toContainText("Beleži eno ročko");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/library-phone.png",
    fullPage: false,
  });
  await dialog
    .getByRole("button", { name: "Dodaj Incline Dumbbell Press", exact: true })
    .click();
  await savedWorkout(page);
  let after = await readWorkoutState(page);
  expect(after.active!.exercises).toHaveLength(3);
  expect(
    after.active!.exercises[2].sets.every((a) => !a.done && a.loadPending),
  ).toBe(true);
  await page.getByText("Pregled vaj", { exact: true }).click();
  await page
    .getByRole("button", { name: /3\. Incline Dumbbell Press/ })
    .click();
  await expect(page.locator(".focus-reference")).toContainText(
    "Uvodna ocena · nizka zanesljivost",
  );
  await page
    .getByRole("button", { name: "Uporabi uvodno oceno", exact: true })
    .click();
  await savedWorkout(page);
  after = await readWorkoutState(page);
  expect(
    after.active!.exercises[2].sets.every(
      (a) => !a.done && !a.loadPending && a.weight > 0 && a.weight < 22.5,
    ),
  ).toBe(true);
  expect(after.active!.exercises.slice(0, 2)).toEqual(before.active!.exercises);
  expect(after.workouts).toEqual(before.workouts);
  await page
    .getByText("Skica, izvedba in podlaga teže", { exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: /Incline Dumbbell Press/ }),
  ).toBeVisible();
});

test("starting an existing template uses the latest weights without rewriting the template or history", async ({
  page,
}) => {
  const before = workoutFixture(false);
  await seedWorkout(page, before);
  await openTraining(page);
  await page
    .getByRole("button", { name: "Začni trening", exact: true })
    .last()
    .click();
  await savedWorkout(page);
  const after = await readWorkoutState(page);
  expect(after.active!.exercises[0].sets.map((a) => a.weight)).toEqual([
    45, 45, 40,
  ]);
  expect(
    after.active!.exercises[0].sets.every(
      (a) => !a.done && a.rir === undefined,
    ),
  ).toBe(true);
  expect(after.templates).toEqual(before.templates);
  expect(after.workouts).toEqual(before.workouts);
  expect(after.measurements).toEqual(before.measurements);
});
