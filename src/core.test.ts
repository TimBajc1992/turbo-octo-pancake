import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { applyPulse, previewPulse, undoImport } from "./importer";
import { backup, restoreBackup, loadState, saveState } from "./db";
import {
  initialState,
  newExercise,
  completeSets,
  records,
  suggestion,
  weeklyAverages,
  rolling,
  localDate,
  nextSessionDate,
  type Workout,
} from "./model";
const fixture = () => ({
  version: 1,
  source: "pulse-v3",
  state: {
    profile: { age: 35, heightCm: 180, weightKg: 90, waistCm: 95 },
    workoutLogs: [
      {
        id: "one",
        date: "2026-09-20",
        splitId: "legs",
        dayName: "Legs",
        durationMin: 1,
        avgHr: 117,
        effort: { score: 5, trimp: 5, zone: "Z2" },
        exercises: [
          {
            exerciseId: "squat",
            slotId: "slot-1",
            name: "Squat",
            sets: [
              { weight: 40, reps: 12, done: true },
              { weight: 42, reps: 10, done: false },
            ],
          },
        ],
      },
    ],
    weightLogs: [
      { date: "2026-09-20", kg: 120 },
      { date: "2026-09-22", kg: 119 },
    ],
    waistLogs: [{ date: "2026-09-20", cm: 117 }],
    daily: [{ date: "2026-09-20", hr: 65, moveKcal: 0 }],
    cardioLogs: [],
    bestLoads: {},
    watch: { connected: true, permissions: ["manual"] },
    streak: 1,
  },
});
describe("Pulse import", () => {
  it("preserves exact dates, unknown properties, all sets, raw values and undated profile", () => {
    const raw = fixture();
    const p = previewPulse(JSON.stringify(raw), initialState());
    const s = applyPulse(initialState(), p);
    expect(s.workouts).toHaveLength(1);
    expect(completeSets(s.workouts[0])).toHaveLength(1);
    expect(s.workouts[0].date).toBe("2026-09-20");
    expect(s.workouts[0].reviewDuration).toBe(true);
    expect(s.workouts[0].exercises[0].mode).toBe("unknown");
    expect(s.workouts[0].exercises[0].sets[0].kind).toBe("unknown");
    expect(s.workouts[0].exercises[0].sets[0].rir).toBeUndefined();
    expect(s.imports[0].raw).toEqual(raw);
    expect(s.measurements).toHaveLength(3);
    expect(s.profile.confirmed).toBe(false);
    expect(s.daily[0].hr).toBe(65);
  });
  it("is idempotent and handles changed source IDs explicitly", () => {
    let s = initialState();
    s = applyPulse(s, previewPulse(JSON.stringify(fixture()), s));
    const p = previewPulse(JSON.stringify(fixture()), s);
    expect(p.duplicates).toBe(5);
    s = applyPulse(s, p);
    expect(s.imports).toHaveLength(1);
    const changed = fixture();
    changed.state.workoutLogs[0].exercises[0].sets[0].weight = 45;
    const conflict = previewPulse(JSON.stringify(changed), s);
    expect(conflict.conflicts).toHaveLength(1);
    expect(
      applyPulse(s, conflict).workouts[0].exercises[0].sets[0].weight,
    ).toBe(40);
    const replaced = applyPulse(s, conflict, [conflict.conflicts[0].id]);
    expect(replaced.workouts[0].exercises[0].sets[0].weight).toBe(45);
    const undone = undoImport(replaced, replaced.imports.at(-1)!.id).state;
    expect(undone.workouts[0].exercises[0].sets[0].weight).toBe(40);
  });
  it("undo preserves later additions and edits", () => {
    let s = initialState();
    s = applyPulse(s, previewPulse(JSON.stringify(fixture()), s));
    s.measurements.push({
      id: "later",
      date: "2026-10-15",
      kind: "weight",
      value: 118,
    });
    s.workouts[0].note = "later edit";
    const r = undoImport(s, s.imports[0].id);
    expect(r.state.workouts).toHaveLength(1);
    expect(r.preserved).toBe(1);
    expect(r.state.measurements.map((m) => m.id)).toEqual(["later"]);
    expect(r.state.daily).toHaveLength(0);
  });
  it("rejects invalid dates and duplicate source IDs without partial changes", () => {
    const raw = fixture();
    raw.state.workoutLogs[0].date = "2026-02-30";
    expect(() => previewPulse(JSON.stringify(raw), initialState())).toThrow();
    raw.state.workoutLogs[0].date = "2026-09-20";
    raw.state.workoutLogs.push(raw.state.workoutLogs[0]);
    expect(() => previewPulse(JSON.stringify(raw), initialState())).toThrow(
      "Podvojeni",
    );
  });
});
describe("data and rules", () => {
  it("recalculates records after edits, only from completed sets", () => {
    let s = initialState();
    s = applyPulse(s, previewPulse(JSON.stringify(fixture()), s));
    expect(records(s)[0].weight).toBe(40);
    s.workouts[0].exercises[0].sets[0].weight = 35;
    expect(records(s)[0].weight).toBe(35);
    s.workouts[0].exercises[0].sets[0].done = false;
    expect(records(s)).toHaveLength(0);
  });
  it("does not invent daily data or zero-fill averages", () => {
    const rows = [
      { id: "a", date: "2026-10-12", value: 120, kind: "weight" as const },
      { id: "b", date: "2026-10-14", value: 118, kind: "weight" as const },
    ];
    expect(weeklyAverages(rows)[0]).toMatchObject({ value: 119, count: 2 });
    expect(rolling(rows)).toHaveLength(2);
    expect(rolling(rows)[1].value).toBe(119);
  });
  it("uses last comparable working sets, requires RIR for increases and stops for pain", () => {
    const s = initialState();
    const e = {
      ...newExercise("Squat"),
      mode: "barbell" as const,
      equipment: "rack",
      confirmed: true,
    };
    e.sets = e.sets.map((a) => ({
      ...a,
      weight: 50,
      reps: 12,
      rir: 3,
      done: true,
    }));
    s.workouts = [
      {
        id: "w",
        name: "Legs",
        date: localDate(),
        splitId: "legs",
        durationMin: 30,
        reviewDuration: false,
        note: "",
        exercises: [e],
      },
    ];
    const plan = { ...e, sets: e.sets.map((a) => ({ ...a, done: false })) };
    expect(suggestion(s, plan).weight).toBe(52.5);
    s.workouts[0].exercises[0].sets[0].rir = undefined;
    expect(suggestion(s, plan).weight).toBe(50);
    expect(suggestion(s, { ...plan, pain: true }).canApply).toBe(false);
    expect(suggestion(s, { ...plan, equipment: "other" }).canApply).toBe(false);
  });
  it("round trips complete backup including active workout and import audit", async () => {
    let s = initialState();
    s = applyPulse(s, previewPulse(JSON.stringify(fixture()), s));
    s.active = { ...s.workouts[0], id: "active", startedAt: Date.now() };
    s.restUntil = Date.now() + 90000;
    const restored = restoreBackup(backup(s));
    expect(restored).toEqual(s);
    await saveState(restored);
    expect(await loadState()).toEqual(s);
    expect(completeSets((await loadState()).active!)).toHaveLength(1);
  });
  it("undo remains valid after JSON backup round trip", () => {
    const s = applyPulse(
      initialState(),
      previewPulse(JSON.stringify(fixture()), initialState()),
    );
    const restored = restoreBackup(backup(s));
    expect(undoImport(restored, s.imports[0].id).state.workouts).toHaveLength(
      0,
    );
  });
  it("finds the next selected training day without moving calendar dates", () => {
    const p = {
      ...initialState().profile,
      schedule: "days" as const,
      days: [0, 3],
    };
    expect(nextSessionDate(p, "2026-10-16")).toBe("2026-10-19");
    expect(nextSessionDate(p, "2026-10-15")).toBe("2026-10-15");
  });
  it("rejects incomplete backups", () => {
    expect(() =>
      restoreBackup('{"format":"tezisce-backup","version":1,"state":{}}'),
    ).toThrow();
  });
});
