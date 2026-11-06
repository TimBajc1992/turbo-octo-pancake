import { describe, expect, it } from "vitest";
import { catalog, byId } from "./exerciseCatalog";
import { initialState, emptySet, newExercise } from "./model";
import {
  createSelectedWorkout,
  dayGroups,
  fitsTraining,
  nextTrainingSuggestion,
  primaryMuscle,
  selectedCandidates,
  trainingCoverage,
  trainingTypes,
  validateSelection,
  validateTrainingDraft,
  validateWorkoutSelection,
} from "./training";
import { backup, restoreBackup } from "./db";

describe("User-built training", () => {
  it("retains the complete Težišče catalog and covers every group for all four training types", () => {
    expect(catalog).toHaveLength(55);
    for (const type of trainingTypes)
      for (const group of dayGroups[type])
        expect(
          catalog.some(
            (c) => fitsTraining(c, type) && primaryMuscle(c) === group,
          ),
        ).toBe(true);
  });
  it("excludes legs and pulls from Push Day, and selects rear delts only for Pull Day", () => {
    expect(fitsTraining(byId("bench_press")!, "push")).toBe(true);
    expect(fitsTraining(byId("seated_row")!, "push")).toBe(false);
    expect(fitsTraining(byId("leg_press")!, "push")).toBe(false);
    expect(fitsTraining(byId("reverse_fly")!, "push")).toBe(false);
    expect(fitsTraining(byId("reverse_fly")!, "pull")).toBe(true);
    expect(fitsTraining(byId("overhead_press")!, "pull")).toBe(false);
  });
  it("counts a compound lift once under its primary muscle and allows at most two per group", () => {
    const chosen = selectedCandidates([
      "bench_press",
      "incline_bench_press",
      "tricep_pushdown",
    ]);
    expect(trainingCoverage("push", chosen)).toEqual([
      { group: "Prsi", label: "Prsi", count: 2 },
      { group: "Ramena", label: "Ramena", count: 0 },
      { group: "Triceps", label: "Triceps", count: 1 },
    ]);
    expect(() =>
      validateSelection("push", [...chosen, byId("pec_deck")!]),
    ).toThrow("največ dve");
    expect(() => validateSelection("push", [chosen[0], chosen[0]])).toThrow(
      "večkrat",
    );
  });
  it("rejects a foreign exercise even if it shares a secondary muscle", () => {
    expect(() => validateSelection("pull", [byId("deadlift")!])).toThrow(
      "ni primerna",
    );
    expect(() => selectedCandidates(["missing"])).toThrow("ni v knjižnici");
  });
  it("requires a deliberate acknowledgement for omitted groups and rejects an empty plan", () => {
    expect(() => createSelectedWorkout(initialState(), "push", [])).toThrow(
      "vsaj eno",
    );
    expect(() =>
      createSelectedWorkout(initialState(), "push", ["bench_press"]),
    ).toThrow("izpuščene");
    const w = createSelectedWorkout(
      initialState(),
      "push",
      ["bench_press"],
      true,
    );
    expect(w.acknowledgedMissingGroups).toEqual(["Ramena", "Triceps"]);
    expect(w.trainingType).toBe("push");
    expect(w.exercises.flatMap((e) => e.sets).every((s) => !s.done)).toBe(true);
  });
  it("does not overwrite an active workout or mutate history when preparing a new one", () => {
    const s = initialState(),
      original = structuredClone(s);
    const w = createSelectedWorkout(s, "push", [
      "bench_press",
      "overhead_press",
      "tricep_pushdown",
    ]);
    expect(s).toEqual(original);
    expect(w.exercises).toHaveLength(3);
    s.active = w;
    expect(() =>
      createSelectedWorkout(s, "pull", ["seated_row"], true),
    ).toThrow("že odprt");
  });
  it("persists a separate valid selection for each training type through a complete backup", () => {
    const s = initialState();
    s.trainingDraft = {
      type: "push",
      plans: { push: ["bench_press"], legs: ["leg_press"] },
    };
    expect(restoreBackup(backup(s)).trainingDraft).toEqual(s.trainingDraft);
    expect(() =>
      validateTrainingDraft({ type: "push", plans: { push: ["leg_press"] } }),
    ).toThrow();
    expect(() => validateTrainingDraft({ type: "other", plans: {} })).toThrow();
  });
  it("applies the same limit when adding or swapping exercises during an active workout", () => {
    const s = initialState(),
      w = createSelectedWorkout(
        s,
        "push",
        ["bench_press", "incline_bench_press"],
        true,
      );
    w.exercises.push({
      ...newExercise("Pec Deck"),
      id: "pec_deck",
      mode: "machine",
    });
    expect(() => validateWorkoutSelection(w)).toThrow("največ dve");
    delete w.trainingType;
    expect(() => validateWorkoutSelection(w)).not.toThrow();
  });
  it("proposes only a day type without auto-selecting exercises or changing legacy templates", () => {
    const s = initialState(),
      before = structuredClone(s);
    expect(nextTrainingSuggestion(s).type).toBe("full");
    expect(s).toEqual(before);
    const w = createSelectedWorkout(s, "push", ["bench_press"], true);
    w.exercises[0].sets = [{ ...emptySet(), done: true }];
    s.workouts = [w];
    expect(nextTrainingSuggestion(s).type).toBe("pull");
    expect(s.trainingDraft).toBeUndefined();
  });
});
