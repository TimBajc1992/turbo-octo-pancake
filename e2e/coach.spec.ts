import { test, expect, type Page } from "@playwright/test";
import { initialState, localDate, newExercise, type State } from "../src/model";
import { defaultCoach, defaultPreference } from "../src/coach";
async function put(page: Page, state: State) {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /Tvoj tempo/ })).toBeVisible();
  await page.evaluate(async (state) => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("tezisce", 1);
      r.onsuccess = () => {
        const tx = r.result.transaction("state", "readwrite");
        tx.objectStore("state").put(state, "current");
        tx.oncomplete = () => {
          r.result.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, state);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Tvoj tempo/ })).toBeVisible();
}
async function read(page: Page): Promise<State> {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("tezisce", 1);
        r.onsuccess = () => {
          const q = r.result
            .transaction("state")
            .objectStore("state")
            .get("current");
          q.onsuccess = () => {
            r.result.close();
            resolve(q.result);
          };
        };
      }),
  );
}
const legacy = () => {
  const s = initialState();
  s.profile = {
    ...s.profile,
    confirmed: true,
    name: "Preizkus",
    goal: "Moč",
    equipment: "Fitnes",
    experience: "Redno treniram",
    limitations: "Brez znanih omejitev",
  };
  s.measurements = [
    { id: "existing", date: "2026-10-01", kind: "weight", value: 100 },
  ];
  return s;
};
async function saved(page: Page) {
  await expect(
    page.getByText("Shranjeno v tej napravi", { exact: true }),
  ).toBeAttached();
}
test("old IndexedDB record survives without coach fields or measurements being rewritten", async ({
  page,
}) => {
  const s = legacy();
  const exercise = newExercise("Obstoječa vaja");
  exercise.sets[0] = { ...exercise.sets[0], weight: 30, reps: 10, done: true };
  s.active = {
    id: "legacy-active",
    name: "Obstoječi trening",
    date: localDate(),
    splitId: "legs",
    durationMin: 0,
    reviewDuration: false,
    note: "Ohrani",
    startedAt: Date.now() - 60000,
    exercises: [exercise],
  };
  s.restUntil = Date.now() + 90000;
  await put(page, s);
  await expect(page.getByRole("region", { name: "Moj trener" })).toBeVisible();
  expect(await read(page)).toEqual(s);
  await page.reload();
  expect(await read(page)).toEqual(s);
});
test("real setup, daily check-in, trial calibration and busy device preserve performed sets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await put(page, legacy());
  await page.getByRole("button", { name: "Nastavitve trenerja" }).click();
  let dialog = page.getByRole("dialog");
  for (const j of ["Kolena", "Hrbet", "Ramena"])
    await dialog
      .getByRole("combobox", { name: j, exact: true })
      .selectOption("none");
  for (const name of [
    "Leg Press",
    "Hack Squat",
    "Lying Leg Curl",
    "Machine Chest Press",
  ])
    await dialog
      .getByRole("checkbox", { name: new RegExp("^" + name) })
      .check();
  await dialog
    .getByRole("checkbox", { name: "Sobno kolo", exact: true })
    .check();
  await dialog
    .getByRole("button", { name: "Potrdi naprave in omejitve" })
    .click();
  await page.getByRole("button", { name: "Kako si danes?" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Kakovost spanja").selectOption("good");
  await dialog.getByLabel("Splošna mišična bolečina").selectOption("low");
  await dialog.getByLabel("Energija", { exact: false }).selectOption("4");
  await dialog.getByRole("button", { name: "Potrdi današnje počutje" }).click();
  await page.getByRole("button", { name: "Potrdi in začni" }).click();
  await page
    .getByRole("button", { name: "Potrdi serijo 1 Leg Press", exact: true })
    .isDisabled()
    .then((disabled) => expect(disabled).toBe(true));
  const exercise = page.locator(".exercise-card").filter({
    has: page.getByRole("heading", { name: "Leg Press", exact: true }),
  });
  await exercise
    .getByRole("checkbox", {
      name: "Potrjujem korak obremenitve na tej napravi.",
    })
    .check();
  await exercise.getByLabel("Dejanska poskusna teža").fill("20");
  await exercise.getByLabel("Dejanske ponovitve").fill("12");
  await exercise.getByLabel("RIR poskusne serije").fill("5");
  await exercise
    .getByRole("checkbox", {
      name: "Poskusna izvedba je bila nadzorovana in udobna.",
    })
    .check();
  await exercise
    .getByRole("button", { name: "Shrani opravljeno poskusno serijo" })
    .click();
  await exercise
    .getByRole("button", { name: "Potrdi predlagano obremenitev" })
    .click();
  await exercise
    .getByRole("button", { name: "Potrdi serijo 2 Leg Press", exact: true })
    .click();
  await saved(page);
  let s = await read(page);
  expect(s.active!.exercises[0].sets[0]).toMatchObject({
    weight: 20,
    kind: "warmup",
    done: true,
  });
  expect(s.active!.exercises[0].sets[1]).toMatchObject({
    weight: 22.5,
    kind: "work",
    done: true,
  });
  await exercise.getByRole("button", { name: "Naprava je zasedena" }).click();
  await exercise
    .getByRole("button", { name: "Trajno spremeni program" })
    .click();
  await saved(page);
  s = await read(page);
  expect(s.active!.exercises[0].sets.every((a) => a.done)).toBe(true);
  expect(s.active!.exercises[1].id).toBe("hack_squat");
  expect(s.active!.exercises[1].sets).toHaveLength(2);
  expect(
    s.active!.exercises[1].sets.every((a) => a.loadPending && !a.done),
  ).toBe(true);
  expect(s.coach!.programs.lower![0].catalogId).toBe("hack_squat");
  expect(s.measurements).toEqual(legacy().measurements);
  await page.setViewportSize({ width: 320, height: 720 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/tezisce-coach-active.png",
    fullPage: true,
  });
  await page.reload();
  expect((await read(page)).active).toEqual(s.active);
});
test("standalone cardio finishes without advancing strength; manually rejected advice stays rejected", async ({
  page,
}) => {
  const s = legacy();
  s.nextTemplate = 2;
  s.coach = {
    ...defaultCoach(),
    confirmed: true,
    available: [],
    cardioEquipment: ["bike"],
    joints: { knees: "none", back: "none", shoulders: "none" },
    checkIn: {
      date: localDate(),
      minutes: 30,
      energy: 3,
      sleep: "good",
      soreness: "low",
      pain: false,
      ill: false,
      choice: "cardio",
      note: "",
      confirmed: true,
    },
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await put(page, s);
  page.once("dialog", (d) => d.accept("Danes izberem sam."));
  await page.getByRole("button", { name: "Zavrni predlog" }).click();
  await saved(page);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Potrdi in začni" }),
  ).toBeDisabled();
  expect((await read(page)).coach!.rejected!.reason).toBe("Danes izberem sam.");
  await page
    .getByRole("button", { name: "Ponovno izračunaj po moji izbiri" })
    .click();
  await page.getByRole("button", { name: "Potrdi in začni" }).click();
  await page
    .getByRole("button", { name: "Potrdi serijo 1 Sobno kolo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Zaključi trening", exact: false })
    .click();
  await saved(page);
  const result = await read(page);
  expect(result.nextTemplate).toBe(2);
  expect(result.workouts).toHaveLength(1);
  expect(result.workouts[0].exercises.every((e) => e.cardio)).toBe(true);
  expect(result.workouts[0].cardioPlan).toMatchObject({
    minutes: 20,
    warmup: 5,
    cooldown: 5,
  });
  expect(result.measurements).toEqual(s.measurements);
});
