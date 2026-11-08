import { byId, candidateForExercise, type Candidate } from "./exerciseCatalog";
import { exerciseFromCatalog } from "./loadAdvice";
import {
  localDate,
  uid,
  type Exercise,
  type State,
  type Workout,
} from "./model";

export const trainingTypes = ["push", "pull", "legs", "full"] as const;
export type TrainingType = (typeof trainingTypes)[number];
export const muscleGroups = [
  "Prsi",
  "Hrbet",
  "Ramena",
  "Biceps",
  "Triceps",
  "Sprednje stegenske",
  "Zadnje stegenske",
  "Zadnjica",
  "Notranje stegenske",
  "Meča",
  "Trup",
] as const;
export type MuscleGroup = (typeof muscleGroups)[number];
export type TrainingDraft = {
  type: TrainingType;
  plans: Partial<Record<TrainingType, string[]>>;
};
export const trainingLabels: Record<TrainingType, string> = {
  push: "Push Day",
  pull: "Pull Day",
  legs: "Legs",
  full: "Celotno telo",
};
export const trainingDescriptions: Record<TrainingType, string> = {
  push: "Prsi · ramena · triceps",
  pull: "Hrbet · zadnji del ramen · biceps",
  legs: "Sprednje, zadnje in notranje stegenske · zadnjica · meča",
  full: "Pregled vseh glavnih mišičnih skupin",
};
export const dayGroups: Record<TrainingType, readonly MuscleGroup[]> = {
  push: ["Prsi", "Ramena", "Triceps"],
  pull: ["Hrbet", "Ramena", "Biceps"],
  legs: [
    "Sprednje stegenske",
    "Zadnje stegenske",
    "Zadnjica",
    "Notranje stegenske",
    "Meča",
  ],
  full: muscleGroups,
};
export function primaryMuscle(c: Candidate): MuscleGroup {
  return (
    c.muscles[0] === "Zadnji del ramen" ? "Ramena" : c.muscles[0]
  ) as MuscleGroup;
}
export function groupLabel(type: TrainingType, group: MuscleGroup) {
  return type === "pull" && group === "Ramena" ? "Zadnji del ramen" : group;
}
export function fitsTraining(c: Candidate, type: TrainingType) {
  if (type === "full") return muscleGroups.includes(primaryMuscle(c));
  if (!dayGroups[type].includes(primaryMuscle(c))) return false;
  if (primaryMuscle(c) === "Ramena")
    return type === "pull"
      ? c.pattern === "rear-delt"
      : c.pattern !== "rear-delt";
  return true;
}
export function trainingCoverage(type: TrainingType, candidates: Candidate[]) {
  return dayGroups[type].map((group) => ({
    group,
    label: groupLabel(type, group),
    count: candidates.filter((c) => primaryMuscle(c) === group).length,
  }));
}
export function selectedCandidates(ids: string[]): Candidate[] {
  return ids.map((id) => {
    const c = byId(id);
    if (!c) throw Error("Vaja ni v knjižnici: " + id);
    return c;
  });
}
export function validateSelection(
  type: TrainingType,
  candidates: Candidate[],
  allowEmpty = false,
) {
  if (!allowEmpty && !candidates.length)
    throw Error("Najprej izberi vsaj eno vajo iz knjižnice.");
  if (new Set(candidates.map((c) => c.id)).size !== candidates.length)
    throw Error("Ista vaja je izbrana večkrat.");
  if (candidates.some((c) => !fitsTraining(c, type)))
    throw Error("Izbrana vaja ni primerna za ta sklop treninga.");
  const over = trainingCoverage(type, candidates).find((g) => g.count > 2);
  if (over)
    throw Error(
      `${over.label}: za isto mišično skupino lahko izbereš največ dve vaji.`,
    );
}
export function validateWorkoutSelection(w: Workout): void {
  if (!w.trainingType) return;
  const candidates = w.exercises
    .filter((e) => !e.cardio)
    .map((e) => candidateForExercise(e));
  if (candidates.some((c) => !c))
    throw Error(
      "Pri tem sklopu izberi vajo iz knjižnice, da lahko preverimo mišično skupino.",
    );
  validateSelection(w.trainingType, candidates as Candidate[], true);
}
export function nextTrainingSuggestion(state: State): {
  type: TrainingType;
  reason: string;
} {
  const last = [...state.workouts]
    .filter((w) =>
      w.exercises.some(
        (e) => !e.cardio && e.sets.some((s) => s.done && s.kind !== "warmup"),
      ),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.finishedAt ?? 0) - (a.finishedAt ?? 0),
    )[0];
  if (!last)
    return {
      type: "full",
      reason:
        "Za začetek predlagamo celotno telo. Vrsto treninga lahko vedno spremeniš.",
    };
  const name = last.name.toLowerCase();
  const previous =
    last.trainingType ??
    (name.includes("push")
      ? "push"
      : name.includes("pull")
        ? "pull"
        : name.includes("legs") || name.includes("noge")
          ? "legs"
          : undefined);
  const type: TrainingType =
    previous === "push"
      ? "pull"
      : previous === "pull"
        ? "legs"
        : previous === "legs"
          ? "push"
          : "full";
  return {
    type,
    reason: `Zadnji trening: ${last.name}, ${last.date}. To je predlog zaporedja; vaje izbereš sam.`,
  };
}
export function createSelectedWorkout(
  state: State,
  type: TrainingType,
  ids: string[],
  acknowledgeMissing = false,
): Workout {
  if (state.active)
    throw Error("Najprej zaključi ali zavrzi že odprt trening.");
  const candidates = selectedCandidates(ids);
  validateSelection(type, candidates);
  const missing = trainingCoverage(type, candidates)
    .filter((g) => !g.count)
    .map((g) => g.group);
  if (missing.length && !acknowledgeMissing)
    throw Error("Pred začetkom preveri izpuščene mišične skupine.");
  return {
    id: uid(),
    name: trainingLabels[type],
    trainingType: type,
    splitId: `moc-forma:${type}`,
    date: localDate(),
    durationMin: 0,
    reviewDuration: false,
    note: "",
    source: "manual",
    startedAt: Date.now(),
    measuredAt: new Date().toISOString(),
    acknowledgedMissingGroups: missing,
    exercises: candidates.map((c) => exerciseFromCatalog(state, c)),
  };
}
export function validateTrainingDraft(
  value: unknown,
): asserts value is TrainingDraft {
  const draft = value as TrainingDraft;
  if (
    !draft ||
    !trainingTypes.includes(draft.type) ||
    !draft.plans ||
    typeof draft.plans !== "object" ||
    Array.isArray(draft.plans)
  )
    throw Error("Neveljavna priprava treninga.");
  for (const [type, ids] of Object.entries(draft.plans)) {
    if (
      !trainingTypes.includes(type as TrainingType) ||
      !Array.isArray(ids) ||
      ids.some((id) => typeof id !== "string")
    )
      throw Error("Neveljavna priprava treninga.");
    validateSelection(type as TrainingType, selectedCandidates(ids), true);
  }
}
export function candidatesForExercises(exercises: Exercise[]) {
  return exercises.flatMap((e) => {
    const c = candidateForExercise(e);
    return c ? [c] : [];
  });
}
