import { test, expect } from "@playwright/test";
import fs from "node:fs";
const sample = {
  version: 1,
  source: "pulse-v3",
  state: {
    profile: { age: 35, heightCm: 180, weightKg: 90, waistCm: 95 },
    workoutLogs: [
      {
        id: "sample",
        date: "2026-09-20",
        dayName: "Legs day",
        splitId: "legs",
        durationMin: 1,
        exercises: [
          {
            exerciseId: "squat",
            name: "Goblet Squat",
            sets: [
              { weight: 40, reps: 12, done: true },
              { weight: 40, reps: 10, done: true },
            ],
          },
        ],
      },
    ],
    weightLogs: [
      { date: "2026-09-20", kg: 120 },
      { date: "2026-10-15", kg: 119 },
    ],
    waistLogs: [{ date: "2026-10-15", cm: 117 }],
    daily: [],
    cardioLogs: [],
    bestLoads: {},
    streak: 0,
  },
};
async function getState(page: any) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open("tezisce", 1);
        req.onsuccess = () => {
          const db = req.result;
          const r = db.transaction("state").objectStore("state").get("current");
          r.onsuccess = () => {
            resolve(r.result);
            db.close();
          };
        };
      }),
  );
}
async function importData(page: any) {
  const file = process.env.PULSE_TEST_FILE;
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(
      file
        ? file
        : {
            name: "synthetic.json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(sample)),
          },
    );
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Potrdi uvoz", exact: false }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Shranjeno v tej napravi", { exact: true }),
  ).toBeAttached();
}
test("private/synthetic import, no duplicates, mobile, active persistence, offline and backup", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /Tvoj tempo/ })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const manifestPath = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  const manifestResponse = await page.request.get(manifestPath!);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(
    new URL(manifest.start_url, new URL(manifestPath!, page.url())).pathname,
  ).toBe(new URL(page.url()).pathname);
  expect(
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return new URL(registration.scope).pathname;
    }),
  ).toBe(new URL(page.url()).pathname);
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const requests = await Promise.all(
      names.map(async (n) =>
        (await (await caches.open(n)).keys()).map((r) => r.url),
      ),
    );
    return requests.flat();
  });
  expect(
    cached.some((url) => url.includes("/assets/") && url.endsWith(".js")),
  ).toBe(true);
  await importData(page);
  const initial = await getState(page);
  if (process.env.PULSE_TEST_FILE) {
    expect(initial.workouts).toHaveLength(12);
    expect(initial.measurements).toHaveLength(18);
    expect(
      initial.workouts.flatMap((w: any) =>
        w.exercises.flatMap((e: any) => e.sets),
      ),
    ).toHaveLength(149);
    expect(initial.daily).toHaveLength(3);
  }
  await importData(page);
  expect((await getState(page)).workouts.length).toBe(initial.workouts.length);
  expect((await getState(page)).imports).toHaveLength(1);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.screenshot({ path: "/tmp/tezisce-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/tezisce-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("navigation", { name: "Glavna navigacija" })
    .getByRole("button", { name: "Trening", exact: true })
    .click();
  await page.getByRole("button", { name: /^Legs / }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Končano" }).click();
  await page
    .getByRole("button", { name: "Začni trening", exact: true })
    .last()
    .click();
  await expect(
    page.getByText("V TEKU", { exact: false }).first(),
  ).toBeVisible();
  let s = await getState(page);
  expect(
    s.active.exercises.flatMap((e: any) => e.sets).every((a: any) => !a.done),
  ).toBe(true);
  const check = page.getByRole("button", { name: /^Potrdi serijo 1 / }).first();
  await check.click();
  await expect(
    page.getByText("Shranjeno v tej napravi", { exact: true }),
  ).toBeAttached();
  s = await getState(page);
  expect(s.active.exercises[0].sets[0].done).toBe(true);
  const until = s.restUntil;
  await page.reload();
  await expect(page.getByRole("heading", { name: /Tvoj tempo/ })).toBeVisible();
  await page
    .getByRole("button", { name: "Nadaljuj trening", exact: false })
    .click();
  await expect(
    page.getByRole("button", { name: /^Razveljavi serijo 1 / }).first(),
  ).toBeVisible();
  expect((await getState(page)).restUntil).toBe(until);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 320, height: 720 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/tezisce-active-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: /^Razveljavi serijo 1 / })
    .first()
    .click();
  await expect(
    page.getByText("Shranjeno v tej napravi", { exact: true }),
  ).toBeAttached();
  expect((await getState(page)).active.exercises[0].sets[0].done).toBe(false);
  await page.getByRole("button", { name: "Nastavitve in profil" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Izvozi celotno varnostno kopijo" })
      .click(),
  ]);
  const path = await download.path();
  const exported = JSON.parse(fs.readFileSync(path!, "utf8"));
  expect(exported.state.active).toBeTruthy();
  await page.locator("input[type=file]").nth(1).setInputFiles(path!);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Zamenjaj in obnovi" }).click();
  await expect(
    page.getByText("Shranjeno v tej napravi", { exact: true }),
  ).toBeAttached();
  expect((await getState(page)).workouts.length).toBe(initial.workouts.length);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: /Tvoj tempo/ })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Tvoj tempo/ })).toBeVisible();
  expect((await getState(page)).active).toBeTruthy();
  await context.setOffline(false);
  expect(errors).toEqual([]);
});
test("measurement edits update actual chart and records", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.getByRole("button", { name: "Dodaj težo", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("input[name=value]").fill("120");
  await dialog.getByRole("button", { name: "Shrani meritev" }).click();
  await page
    .getByRole("navigation", { name: "Glavna navigacija" })
    .getByRole("button", { name: "Napredek" })
    .click();
  await expect(page.locator("svg[role=img]").first()).toHaveAttribute(
    "aria-label",
    /120 kg/,
  );
  await page.getByRole("button", { name: "Uredi", exact: true }).click();
  await page.getByRole("dialog").locator("input[name=value]").fill("118.5");
  await page.getByRole("button", { name: "Shrani meritev" }).click();
  await expect(page.locator("svg[role=img]").first()).toHaveAttribute(
    "aria-label",
    /118,5 kg/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
