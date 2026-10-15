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
test("trainer fills starter templates through one equipment review without replacing custom exercises", async ({
  page,
}) => {
  const s = legacy();
  s.templates.find((t) => t.name === "Upper")!.exercises = [
    newExercise("Moja ročna vaja"),
  ];
  await put(page, s);
  await page.getByRole("button", { name: "Trening", exact: true }).click();
  await expect(page.getByLabel("Programi trenerja")).toContainText("Leg Press");
  await page
    .getByRole("button", { name: "Pripravi moje treninge", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  for (const name of ["Kolena", "Hrbet", "Ramena"])
    await dialog
      .getByRole("combobox", { name, exact: true })
      .selectOption("none");
  await dialog
    .getByRole("button", { name: "Potrdi naprave in omejitve" })
    .click();
  await saved(page);
  const actual = await read(page);
  expect(
    actual.templates
      .filter((t) => t.name !== "Upper")
      .every((t) => t.exercises.length > 0),
  ).toBe(true);
  expect(actual.templates.find((t) => t.name === "Upper")!.exercises).toEqual(
    s.templates.find((t) => t.name === "Upper")!.exercises,
  );
  expect(actual.measurements).toEqual(s.measurements);
  await page.reload();
  expect((await read(page)).templates).toEqual(actual.templates);
});
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

test("trainer time accepts individual keystrokes, deletion and persists minutes", async ({
  page,
}) => {
  const state = legacy();
  state.coach = {
    ...defaultCoach(),
    confirmed: true,
    available: [],
    cardioEquipment: ["bike"],
    joints: { knees: "none", back: "none", shoulders: "none" },
  };
  await put(page, state);
  await page.getByRole("button", { name: "Nastavitve trenerja" }).click();
  const dialog = page.getByRole("dialog");
  for (const [label, minutes] of [
    ["Delovnik (min)", "60"],
    ["Sobota (min)", "90"],
    ["Nedelja (min)", "120"],
  ]) {
    const input = dialog.getByLabel(label, { exact: true });
    await input.fill("");
    await expect(input).toHaveValue("");
    await input.pressSequentially(minutes.slice(0, 1));
    await expect(input).toHaveValue(minutes.slice(0, 1));
    await input.pressSequentially(minutes.slice(1));
    await expect(input).toHaveValue(minutes);
    await input.press("Tab");
  }
  const weekday = dialog.getByLabel("Delovnik (min)", { exact: true });
  await weekday.fill("");
  await weekday.press("Tab");
  await expect(weekday).toHaveValue("60");
  await weekday.fill("200");
  await expect(weekday).toHaveValue("200");
  await weekday.press("Tab");
  await expect(weekday).toHaveValue("180");
  await weekday.fill("");
  await weekday.pressSequentially("60");
  await dialog
    .getByRole("button", { name: "Potrdi naprave in omejitve" })
    .click();
  await saved(page);
  await page.reload();
  const stored = await read(page);
  expect(stored.coach?.weekdayMinutes).toBe(60);
  expect(stored.coach?.saturdayMinutes).toBe(90);
  expect(stored.coach?.sundayMinutes).toBe(120);
  expect(stored.measurements).toEqual(state.measurements);
  await page.getByRole("button", { name: "Kako si danes?" }).click();
  const today = page.getByLabel("Čas danes (min)", { exact: true });
  await today.fill("");
  await today.pressSequentially("60");
  await expect(today).toHaveValue("60");
  await page.getByRole("button", { name: "Potrdi današnje počutje" }).click();
  await saved(page);
  await page.reload();
  expect((await read(page)).coach?.checkIn?.minutes).toBe(60);
});

test("Shortcuts intake requires local consent, clears health URLs and updates one row without touching workouts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const original = legacy();
  await put(page, original);
  await page.getByRole("button", { name: "Nastavitve in profil" }).click();
  const enable = page.getByRole("button", {
    name: "Omogoči sprejem iz Bližnjic",
  });
  await expect(enable).toBeDisabled();
  await page.getByRole("checkbox", { name: /Dovolim prenos izbranih/ }).check();
  await enable.click();
  await expect
    .poll(async () => (await read(page)).healthBridge?.enabled)
    .toBe(true);
  const token = (await read(page)).healthBridge!.token;
  await page
    .getByText("Ročna nastavitev na iPhonu, če nimaš Maca z iCloudom", { exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const packet = {
    format: "tezisce-health-shortcuts",
    version: 1,
    token,
    source: "Apple Watch",
    date: localDate(),
    updatedAt: new Date().toISOString(),
    steps: 4321,
    hrvSDNN: 42,
    hrvMeasuredAt: new Date().toISOString(),
  };
  const transfer = async (payload: typeof packet) => {
    await page.goto("./#health=" + encodeURIComponent(JSON.stringify(payload)));
    await expect(page).not.toHaveURL(/#health=/);
  };
  await transfer(packet);
  await expect.poll(async () => (await read(page)).daily.length).toBe(1);
  await transfer({
    ...packet,
    steps: 5000,
    updatedAt: new Date().toISOString(),
  });
  await expect.poll(async () => (await read(page)).daily[0].steps).toBe(5000);
  const current = await read(page);
  expect(current.daily).toHaveLength(1);
  expect(current.coach?.observations).toHaveLength(1);
  expect(current.workouts).toEqual(original.workouts);
  expect(current.measurements).toEqual(original.measurements);
  expect(current.nextTemplate).toBe(original.nextTemplate);
  await page
    .getByRole("button", { name: "Izklopi sprejem iz Bližnjic" })
    .click();
  await expect
    .poll(async () => (await read(page)).healthBridge?.enabled)
    .toBe(false);
  await transfer({ ...packet, steps: 9999 });
  await expect(page.getByText(/Najprej v Nastavitvah omogoči/)).toBeVisible();
  expect((await read(page)).daily[0].steps).toBe(5000);
});
