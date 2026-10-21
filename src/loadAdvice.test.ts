import { describe, expect, it } from "vitest";
import { catalog, candidateForExercise } from "./exerciseCatalog";
import {
  applyLoadAdvice,
  completeQuickSet,
  exerciseFromCatalog,
  loadAdvice,
  prepareWorkoutLoads,
} from "./loadAdvice";
import { backup, restoreBackup } from "./db";
import {
  emptySet,
  initialState,
  localDate,
  newExercise,
  plannedExercise,
  type Exercise,
  type Workout,
} from "./model";

const ago = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDate(d);
};
const exercise = (id = "bench_press", weight = 60, reps = 10): Exercise => ({
  ...newExercise("Bench Press"),
  id,
  mode: "barbell",
  equipment: "Rack A",
  confirmed: true,
  sets: [weight, weight, weight - 5].map((weight) => ({
    ...emptySet(),
    weight,
    reps,
    done: true,
  })),
});
const workout = (e: Exercise, days = 1): Workout => ({
  id: crypto.randomUUID(),
  name: "Sintetična zgodovina",
  date: ago(days),
  splitId: "original-template",
  exercises: [e],
  durationMin: 42,
  reviewDuration: false,
  note: "ohrani opombo",
});

describe("latest results and conservative introductory estimates", () => {
  it("uses the latest completed result, including lower weights, never an old record or future entry", () => {
    const s = initialState(),
      target = plannedExercise(exercise());
    s.workouts = [
      workout(exercise("bench_press", 100), 10),
      workout(exercise("bench_press", 40), 1),
      workout(exercise("bench_press", 150), -1),
    ];
    const advice = loadAdvice(s, target);
    expect(advice.kind).toBe("last");
    expect(advice.last?.sets.map((a) => a.weight)).toEqual([40, 40, 35]);
    expect(applyLoadAdvice(target, advice).sets.map((a) => a.weight)).toEqual([
      40, 40, 35,
    ]);
  });
  it("recognises exact legacy names without changing IDs or mistaking a Goblet Squat for a barbell squat", () => {
    const e = newExercise("Goblet Squat");
    e.id = "squat";
    expect(candidateForExercise(e)?.id).toBe("goblet_squat");
    expect(e.id).toBe("squat");
    expect(
      candidateForExercise(newExercise("Moj neznani počep")),
    ).toBeUndefined();
    expect(candidateForExercise(newExercise("Biceps Curl"))).toBeUndefined();
  });
  it("shows uncertain old history as stored and does not silently prefill it", () => {
    const s = initialState(),
      old = exercise();
    old.mode = "unknown";
    old.confirmed = false;
    old.equipment = "";
    s.workouts = [workout(old)];
    const target = plannedExercise(old),
      advice = loadAdvice(s, target);
    expect(advice.last?.exercise).toEqual(old);
    expect(advice.automatic).toBe(false);
  });
  it("does not copy between changed devices or hide a painful last result behind an estimate", () => {
    const s = initialState();
    s.workouts = [workout(exercise())];
    const target = plannedExercise(exercise());
    target.equipment = "Rack B";
    expect(loadAdvice(s, target).canApply).toBe(false);
    s.workouts[0].exercises[0].pain = true;
    target.equipment = "Rack A";
    expect(loadAdvice(s, target)).toMatchObject({
      kind: "last",
      canApply: false,
    });
  });
  it("offers a low-confidence trial for a NEW close free-weight variation with per-dumbbell units", () => {
    const s = initialState();
    s.workouts = [workout(exercise())];
    const target = exerciseFromCatalog(
      s,
      catalog.find((c) => c.id === "incline_dumbbell_press")!,
    );
    target.increment = 2.5;
    const advice = loadAdvice(s, target);
    expect(advice.kind).toBe("estimate");
    expect(advice.weight).toBe(17.5); // median 60 total × 0.6 / two dumbbells, rounded down
    expect(advice.range).toEqual([15, 20]);
    expect(advice.automatic).toBe(false);
    expect(target.sets.every((a) => a.loadPending && !a.done)).toBe(true);
    expect(
      applyLoadAdvice(target, advice).sets.every(
        (a) => a.weight === 17.5 && !a.done,
      ),
    ).toBe(true);
  });
  it("always prefers the target's own last record to a related exercise estimate", () => {
    const s = initialState();
    const other = exerciseFromCatalog(
      s,
      catalog.find((c) => c.id === "incline_dumbbell_press")!,
    );
    other.sets = [{ ...emptySet(), weight: 12, reps: 8, done: true }];
    s.workouts = [workout(exercise()), workout(other, 3)];
    expect(loadAdvice(s, plannedExercise(other))).toMatchObject({
      kind: "last",
      weight: 12,
    });
  });
  it("does not turn machine-stack kg, unknown units, warmups, pain or stale results into a new exercise prediction", () => {
    const s = initialState(),
      target = exerciseFromCatalog(
        s,
        catalog.find((c) => c.id === "incline_dumbbell_press")!,
      );
    for (const modify of [
      (e: Exercise) => {
        e.mode = "unknown";
      },
      (e: Exercise) => {
        e.pain = true;
      },
      (e: Exercise) => {
        e.sets.forEach((a) => (a.kind = "warmup"));
      },
    ]) {
      const e = exercise();
      modify(e);
      s.workouts = [workout(e)];
      expect(loadAdvice(s, target).kind).toBe("none");
    }
    s.workouts = [workout(exercise(), 61)];
    expect(loadAdvice(s, target).kind).toBe("none");
    s.workouts = [workout(exercise())];
    const machine = exerciseFromCatalog(
      s,
      catalog.find((c) => c.id === "machine_chest_press")!,
    );
    expect(loadAdvice(s, machine).kind).toBe("none");
    target.pain = true;
    expect(loadAdvice(s, target).canApply).toBe(false);
  });
});

describe("plan edits preserve evidence of performance and the existing collection", () => {
  it("only fills unfinished working rows, preserving completed sets, warmups and their RIR", () => {
    const s = initialState();
    s.workouts = [workout(exercise())];
    const target = plannedExercise(exercise());
    target.sets[0] = {
      ...target.sets[0],
      weight: 20,
      kind: "warmup",
      done: true,
      rir: 5,
    };
    target.sets[1] = { ...target.sets[1], weight: 30, done: true, rir: 2 };
    const before = structuredClone(target);
    const updated = applyLoadAdvice(target, loadAdvice(s, target));
    expect(updated.sets.slice(0, 2)).toEqual(before.sets.slice(0, 2));
    expect(updated.sets[2].done).toBe(false);
    expect(target).toEqual(before);
  });
  it("logs exactly one actual set and repeats its load only into still-empty working rows", () => {
    const e = exercise();
    e.sets = [
      { ...emptySet(), weight: 40, reps: 10 },
      { ...emptySet(), loadPending: true },
      { ...emptySet(), weight: 35 },
    ];
    const updated = completeQuickSet(e, e.sets[0].id);
    expect(updated.sets.map((a) => a.done)).toEqual([true, false, false]);
    expect(updated.sets[1]).toMatchObject({
      weight: 40,
      reps: 10,
      loadPending: false,
    });
    expect(updated.sets[2].weight).toBe(35);
    expect(e.sets.every((a) => !a.done)).toBe(true);
    expect(completeQuickSet(e, e.sets[1].id)).toBe(e);
  });
  it("prepares only a newly started workout and round-trips all legacy data unchanged", () => {
    const s = initialState();
    s.workouts = [workout(exercise())];
    s.active = workout(exercise("bench_press", 30), 0);
    s.measurements = [
      { id: "existing", date: ago(2), kind: "weight", value: 96 },
    ];
    s.daily = [{ id: "existing-day", date: ago(1), steps: 8000 }];
    s.healthBridge = { enabled: true, token: crypto.randomUUID() };
    s.templates[0].exercises = [plannedExercise(exercise("bench_press", 20))];
    const before = structuredClone(s),
      next = workout(s.templates[0].exercises[0], 0);
    const prepared = prepareWorkoutLoads(s, next);
    expect(prepared.exercises[0].sets.map((a) => a.weight)).toEqual([
      60, 60, 55,
    ]);
    expect(prepared.exercises[0].sets.every((a) => !a.done)).toBe(true);
    expect(s).toEqual(before);
    expect(restoreBackup(backup(s))).toEqual(before);
  });
  it("ships a unique complete catalogue and sensible units for all new exercise plans", () => {
    expect(catalog.length).toBeGreaterThanOrEqual(50);
    expect(new Set(catalog.map((c) => c.id)).size).toBe(catalog.length);
    const s = initialState();
    for (const c of catalog) {
      const e = exerciseFromCatalog(s, c);
      expect(e.sets).toHaveLength(3);
      expect(e.sets.every((a) => !a.done)).toBe(true);
      expect(e.mode).toBe(c.mode ?? "machine");
    }
  });
});
