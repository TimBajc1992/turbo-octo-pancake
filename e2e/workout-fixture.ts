import { expect, type Page } from "@playwright/test";
import {
  emptySet,
  initialState,
  localDate,
  newExercise,
  plannedExercise,
  type State,
  type Workout,
} from "../src/model";

export function workoutFixture(active = true): State {
  const s = initialState();
  s.profile = {
    ...s.profile,
    name: "Sintetični preizkus",
    confirmed: true,
    goal: "Moč",
    equipment: "Fitnes",
    experience: "Redno treniram",
    limitations: "Brez omejitev",
  };
  const ago = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return localDate(d);
  };
  const bench = {
    ...newExercise("Bench Press"),
    id: "legacy-bench-id",
    mode: "barbell" as const,
    equipment: "Rack A",
    confirmed: true,
  };
  const historical = (days: number, weight: number): Workout => ({
    id: `original-workout-${days}`,
    date: ago(days),
    name: "Obstoječi trening",
    splitId: "original-split",
    durationMin: 46,
    reviewDuration: false,
    note: "Prvotna opomba",
    source: "pulse-v3",
    externalId: `external-${days}`,
    raw: { synthetic: true },
    exercises: [
      {
        ...bench,
        sets: [weight, weight, weight - 5].map((weight) => ({
          ...emptySet(),
          weight,
          reps: 10,
          done: true,
          rir: 2,
        })),
      },
    ],
  });
  s.workouts = [historical(8, 90), historical(1, 45)];
  s.measurements = [
    { id: "original-weight", date: ago(1), kind: "weight", value: 95.2 },
  ];
  s.daily = [
    {
      id: "original-day",
      date: ago(1),
      steps: 8123,
      source: "apple-shortcuts",
    },
  ];
  s.cardio = [{ id: "original-cardio", date: ago(1), minutes: 25 }];
  s.imports = [
    {
      id: "original-import",
      at: new Date().toISOString(),
      source: "pulse-v3",
      raw: { synthetic: true },
      warnings: [],
      changes: [],
    },
  ];
  s.healthBridge = {
    enabled: true,
    token: "c66adf98-eb52-4b2d-bb39-62d60a3c41c0",
  };
  s.nextTemplate = 4;
  s.templates[0].exercises = [
    plannedExercise({
      ...bench,
      sets: [emptySet(), emptySet(), emptySet()].map((a) => ({
        ...a,
        weight: 10,
      })),
    }),
  ];
  if (active)
    s.active = {
      id: "existing-active",
      date: localDate(),
      name: "Trening v teku pred posodobitvijo",
      splitId: s.templates[0].id,
      durationMin: 0,
      reviewDuration: false,
      startedAt: Date.now() - 900000,
      note: "Ohrani tudi aktivni trening",
      exercises: [
        {
          ...bench,
          sets: [
            { ...emptySet(), weight: 32.5, reps: 8, rir: 2, done: true },
            { ...emptySet(), weight: 30, reps: 10 },
            { ...emptySet(), loadPending: true },
          ],
        },
        {
          ...newExercise("Lat Pulldown"),
          id: "lat_pulldown",
          mode: "machine",
          equipment: "Lat A",
          sets: [emptySet(), emptySet()].map((a) => ({ ...a, weight: 30 })),
        },
      ],
    };
  return s;
}
export async function seedWorkout(page: Page, s: State, url = "./") {
  await page.goto(url);
  await expect(page.getByRole("heading", { name: /Tvoj tempo/ })).toBeVisible();
  await page.evaluate(
    async (s) =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("tezisce", 1);
        r.onsuccess = () => {
          const tx = r.result.transaction("state", "readwrite");
          tx.objectStore("state").put(s, "current");
          tx.oncomplete = () => {
            r.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    s,
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: /Tvoj tempo/ })).toBeVisible();
}
export async function readWorkoutState(page: Page): Promise<State> {
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
export async function openTraining(page: Page) {
  await page
    .locator("nav:visible")
    .getByRole("button", { name: "Trening", exact: true })
    .click();
}
export async function savedWorkout(page: Page) {
  await expect(
    page.getByText("Shranjeno v tej napravi", { exact: true }),
  ).toBeAttached();
}
