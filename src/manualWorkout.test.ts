import { describe, expect, it } from "vitest";
import { byId } from "./exerciseCatalog";
import { exerciseFromCatalog } from "./loadAdvice";
import { initialState, newExercise, type Workout } from "./model";
import { backup, restoreBackup } from "./db";
import {
  createSyncSecret,
  decryptSnapshot,
  encryptSnapshot,
  mergeSnapshots,
  SyncConflict,
} from "./syncCore";
import {
  commitManualWorkout,
  copyManualSet,
  createManualWorkoutDraft,
  finishManualWorkout,
  newManualExercise,
  newManualSet,
} from "./manualWorkout";
const today = "2026-11-06",
  recordedAt = "2026-11-06T10:00:00.000Z";
function filledDraft(): Workout {
  const draft = createManualWorkoutDraft("2026-11-04");
  const e = newManualExercise(undefined, "Moja dejanska vaja");
  e.mode = "dumbbell";
  e.equipment = "Ročki doma";
  e.sets[0] = {
    ...e.sets[0],
    weight: 12.5,
    reps: 9,
    loadPending: false,
    rir: 2,
  };
  draft.name = "Trening brez telefona";
  draft.exercises = [e];
  return draft;
}
describe("Retrospective workout entry", () => {
  it("starts an independent draft without inventing performed sets or clock times", () => {
    const draft = createManualWorkoutDraft(today);
    expect(draft.exercises).toEqual([]);
    expect(draft).toMatchObject({
      entryMode: "retrospective",
      date: today,
      durationMin: 0,
      reviewDuration: true,
    });
    expect(draft.startedAt).toBeUndefined();
    expect(draft.finishedAt).toBeUndefined();
    expect(newManualSet()).toMatchObject({
      done: false,
      loadPending: true,
      reps: 0,
    });
  });
  it("uses library identity and instructions without turning old planned loads into facts", () => {
    const state = initialState(),
      old = exerciseFromCatalog(state, byId("bench_press")!);
    old.sets[0] = {
      ...old.sets[0],
      weight: 90,
      reps: 11,
      done: true,
      loadPending: false,
      rir: 3,
    };
    old.confirmed = true;
    const before = structuredClone(old),
      e = newManualExercise(old);
    expect(old).toEqual(before);
    expect(e.id).toBe(old.id);
    expect(e.confirmed).toBe(false);
    expect(e.sets).toHaveLength(1);
    expect(e.sets[0]).toMatchObject({
      weight: 0,
      reps: 0,
      done: false,
      loadPending: true,
    });
    expect(e.sets[0].id).not.toBe(old.sets[0].id);
  });
  it("records the chosen past date, actual values and entry time without fabricating start/end times", () => {
    const draft = filledDraft(),
      before = structuredClone(draft);
    const finished = finishManualWorkout(draft, today, recordedAt);
    expect(draft).toEqual(before);
    expect(finished).toMatchObject({
      date: "2026-11-04",
      recordedAt,
      source: "manual",
      entryMode: "retrospective",
    });
    expect(finished.exercises[0].sets[0]).toMatchObject({
      weight: 12.5,
      reps: 9,
      rir: 2,
      done: true,
      loadPending: false,
    });
    expect(finished.startedAt).toBeUndefined();
    expect(finished.finishedAt).toBeUndefined();
  });
  it("requires real values and rejects future dates, invalid calendar days and empty entries", () => {
    expect(() =>
      finishManualWorkout(createManualWorkoutDraft(today), today),
    ).toThrow("vsaj eno");
    for (const date of ["2026-11-07", "2026-02-30"])
      expect(() =>
        finishManualWorkout({ ...filledDraft(), date }, today),
      ).toThrow("datum");
    const draft = filledDraft();
    draft.exercises[0].sets[0].loadPending = true;
    expect(() => finishManualWorkout(draft, today)).toThrow("dejansko težo");
    draft.exercises[0].sets[0].loadPending = false;
    draft.exercises[0].sets[0].reps = 0;
    expect(() => finishManualWorkout(draft, today)).toThrow("ponovitve");
    draft.exercises[0].sets[0].reps = 9;
    draft.exercises[0].sets[0].rir = 11;
    expect(() => finishManualWorkout(draft, today)).toThrow("RIR");
  });
  it("keeps unknown duration unknown and includes an explicitly entered duration", () => {
    expect(finishManualWorkout(filledDraft(), today).reviewDuration).toBe(true);
    expect(
      finishManualWorkout({ ...filledDraft(), durationMin: 50 }, today),
    ).toMatchObject({ durationMin: 50, reviewDuration: false });
    expect(() =>
      finishManualWorkout({ ...filledDraft(), durationMin: -5 }, today),
    ).toThrow("Trajanje");
  });
  it("permits an explicitly recorded zero additional load and preserves warm-up/work kinds", () => {
    const d = filledDraft();
    d.exercises[0].sets[0].weight = 0;
    d.exercises[0].sets[0].kind = "warmup";
    const second = copyManualSet(d.exercises[0].sets[0]);
    second.kind = "work";
    d.exercises[0].sets.push(second);
    const saved = finishManualWorkout(d, today);
    expect(saved.exercises[0].sets.map((s) => s.kind)).toEqual([
      "warmup",
      "work",
    ]);
    expect(saved.exercises[0].sets.every((s) => s.weight === 0 && s.done)).toBe(
      true,
    );
    expect(second.id).not.toBe(d.exercises[0].sets[0].id);
  });
  it("adds the historical record without replacing an active workout or any existing collection", () => {
    const state = initialState();
    state.active = {
      ...filledDraft(),
      id: "active-original",
      note: "Ohrani aktivni zapis",
    };
    state.workouts = [
      {
        ...finishManualWorkout(filledDraft(), today),
        id: "original-history",
        raw: { original: true },
      },
    ];
    state.trainingDraft = { type: "push", plans: { push: ["bench_press"] } };
    state.restUntil = 12345;
    state.manualWorkoutDraft = filledDraft();
    const before = structuredClone(state),
      next = commitManualWorkout(state, today);
    expect(state).toEqual(before);
    expect(next.active).toBe(state.active);
    expect(next.restUntil).toBe(state.restUntil);
    expect(next.workouts.slice(0, -1)).toEqual(state.workouts);
    expect(next.trainingDraft).toEqual(state.trainingDraft);
    for (const key of [
      "measurements",
      "daily",
      "cardio",
      "imports",
      "templates",
    ] as const)
      expect(next[key]).toBe(state[key]);
    expect(next.workouts).toHaveLength(2);
    expect(next.manualWorkoutDraft).toBeUndefined();
    expect(() => commitManualWorkout(next, today)).toThrow("ni odprt");
  });
  it("retains every actual exercise even when a past session differs from the two-per-group planning limit", () => {
    const draft = createManualWorkoutDraft(today);
    draft.trainingType = "push";
    draft.exercises = ["bench_press", "incline_bench_press", "pec_deck"].map(
      (id) => {
        const e = newManualExercise(
          exerciseFromCatalog(initialState(), byId(id)!),
        );
        e.sets[0] = { ...e.sets[0], weight: 20, reps: 10, loadPending: false };
        return e;
      },
    );
    expect(finishManualWorkout(draft, today).exercises).toHaveLength(3);
  });
  it("restores an unfinished entry and a completed entry from full backups", () => {
    const state = initialState();
    state.manualWorkoutDraft = filledDraft();
    expect(restoreBackup(backup(state))).toEqual(state);
    const next = commitManualWorkout(state, today);
    expect(restoreBackup(backup(next))).toEqual(next);
  });
  it("keeps two-device draft edits atomic instead of mixing different performed facts", () => {
    const base = initialState();
    base.manualWorkoutDraft = filledDraft();
    const left = structuredClone(base),
      right = structuredClone(base);
    left.manualWorkoutDraft!.exercises[0].sets[0].weight = 50;
    right.manualWorkoutDraft!.exercises[0].sets[0].reps = 12;
    expect(() => mergeSnapshots(base, left, right)).toThrow(SyncConflict);
  });
  it("preserves retrospective entries through the existing encrypted Cloudflare snapshot format", async () => {
    const state = initialState();
    state.manualWorkoutDraft = filledDraft();
    const saved = commitManualWorkout(state, today),
      key = createSyncSecret();
    expect(
      await decryptSnapshot(await encryptSnapshot(saved, key), key),
    ).toEqual(saved);
  });
  it("records cardio minutes separately from strength loads", () => {
    const draft = filledDraft();
    draft.exercises[0].cardio = true;
    draft.exercises[0].sets[0] = {
      ...newManualSet(),
      reps: 25,
      weight: 0,
      loadPending: false,
    };
    expect(finishManualWorkout(draft, today).exercises[0]).toMatchObject({
      cardio: true,
      sets: [{ reps: 25, weight: 0, done: true, loadPending: false }],
    });
  });
});
