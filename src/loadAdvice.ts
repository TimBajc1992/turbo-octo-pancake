import {
  dateLabel,
  emptySet,
  localDate,
  newExercise,
  num,
  type Exercise,
  type LiftSet,
  type State,
  type Workout,
} from "./model";
import { candidateForExercise, type Candidate } from "./exerciseCatalog";

export interface RecordedExercise {
  workout: Workout;
  exercise: Exercise;
  sets: LiftSet[];
}
export interface LoadAdvice {
  kind: "last" | "estimate" | "none";
  last?: RecordedExercise;
  weight?: number;
  range?: [number, number];
  reps: number;
  sources: RecordedExercise[];
  reason: string;
  canApply: boolean;
  automatic: boolean;
}
const performed = (e: Exercise) =>
  e.sets.filter((s) => s.done && s.kind !== "warmup" && s.reps > 0);
const age = (date: string, today: string) =>
  (Date.parse(today + "T12:00:00Z") - Date.parse(date + "T12:00:00Z")) /
  86400000;
function sameExercise(a: Exercise, b: Exercise) {
  const left = candidateForExercise(a),
    right = candidateForExercise(b);
  if (left && right && left.id !== right.id) return false;
  return a.id === b.id || (!!left && left.id === right?.id);
}
export function recordedExercises(
  s: State,
  today = localDate(),
  excludeWorkout?: string,
): RecordedExercise[] {
  return s.workouts
    .filter((w) => w.id !== excludeWorkout && w.date <= today)
    .map((workout, index) => ({ workout, index }))
    .sort(
      (a, b) =>
        b.workout.date.localeCompare(a.workout.date) ||
        (b.workout.finishedAt ?? 0) - (a.workout.finishedAt ?? 0) ||
        b.index - a.index,
    )
    .flatMap(({ workout }) =>
      workout.exercises
        .filter((e) => !e.cardio && performed(e).length)
        .map((exercise) => ({ workout, exercise, sets: performed(exercise) })),
    );
}
export function lastRecorded(
  s: State,
  e: Exercise,
  today = localDate(),
  excludeWorkout?: string,
) {
  return recordedExercises(s, today, excludeWorkout).find((row) =>
    sameExercise(row.exercise, e),
  );
}
export function historySummary(row: RecordedExercise) {
  return `${dateLabel(row.workout.date)} · ${row.sets.map((a) => `${num(a.weight)} × ${a.reps}`).join(" / ")}`;
}
function comparableLoad(a: Exercise, b: Exercise) {
  if (a.mode !== b.mode) return false;
  if (a.equipment.trim() !== b.equipment.trim()) return false;
  if (a.coach || b.coach)
    return (
      !!a.coach?.rom &&
      a.coach.rom === b.coach?.rom &&
      a.coach.convention === b.coach?.convention
    );
  return true;
}
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b),
    middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const down = (value: number, step: number) =>
  Math.round(Math.floor((value + 1e-8) / step) * step * 100) / 100;

// Deliberately limited to close free-weight variations. These are product
// heuristics for a first light trial, not validated kg conversions or 1RM tests.
const transferFamilies = [
  [
    "bench_press",
    "incline_bench_press",
    "dumbbell_bench_press",
    "incline_dumbbell_press",
  ],
  ["overhead_press", "dumbbell_shoulder_press"],
  ["barbell_row", "dumbbell_row"],
  ["dumbbell_biceps_curl", "incline_dumbbell_curl", "barbell_curl"],
  ["romanian_deadlift", "dumbbell_romanian_deadlift"],
  ["bulgarian_split_squat", "reverse_lunge"],
];
const units = (c: Candidate) => (c.mode === "dumbbell" ? 2 : 1);
export function loadAdvice(
  s: State,
  e: Exercise,
  today = localDate(),
  excludeWorkout?: string,
): LoadAdvice {
  const last = lastRecorded(s, e, today, excludeWorkout);
  const base: LoadAdvice = {
    kind: "none",
    reps: e.minReps,
    sources: [],
    reason: "Najprej izberi lahko uvodno obremenitev.",
    canApply: false,
    automatic: false,
  };
  const check = s.coach?.checkIn;
  const pain = e.pain || (check?.date === today && (check.pain || check.ill));
  if (last) {
    const same = comparableLoad(last.exercise, e);
    const safe = !pain && !last.exercise.pain && same;
    return {
      ...base,
      kind: "last",
      last,
      sources: [last],
      weight: last.sets[0].weight,
      reps: last.sets[0].reps,
      canApply: safe,
      automatic:
        safe &&
        e.confirmed &&
        e.mode !== "unknown" &&
        last.sets.every((a) => a.kind === "work") &&
        age(last.workout.date, today) <= 14,
      reason:
        pain || last.exercise.pain
          ? "Zapis vsebuje bolečino. Najprej prilagodi vajo in obremenitev."
          : !same
            ? "Zadnji shranjeni zapis; oprema ali način beleženja se razlikujeta. Številke niso neposreden predlog za današnjo izvedbo."
            : age(last.workout.date, today) > 14
              ? "Zadnji dejanski rezultat. Po premoru začni lažje in obremenitev preveri z uvodno serijo."
              : "Zadnje dejanske serije te vaje. Različne teže in ponovitve ostanejo ohranjene.",
    };
  }
  const target = candidateForExercise(e);
  if (
    !target ||
    pain ||
    !["barbell", "dumbbell"].includes(e.mode) ||
    e.mode !== target.mode
  )
    return {
      ...base,
      reason: pain
        ? "Ob bolečini ali bolezni ne predlagamo teže."
        : base.reason,
    };
  const family = transferFamilies.find((f) => f.includes(target.id));
  if (!family) return base;
  const step =
    Number.isFinite(e.increment) && e.increment > 0 ? e.increment : 2.5;
  const seen = new Set<string>();
  const sources = recordedExercises(s, today, excludeWorkout)
    .filter((row) => {
      const source = candidateForExercise(row.exercise);
      if (
        !source ||
        !family.includes(source.id) ||
        seen.has(source.id) ||
        row.exercise.pain ||
        row.exercise.mode !== source.mode ||
        !source.muscles.some((m) => target.muscles.includes(m)) ||
        age(row.workout.date, today) > 60 ||
        !row.sets.some(
          (a) =>
            a.kind === "work" && a.weight > 0 && a.reps >= 3 && a.reps <= 20,
        )
      )
        return false;
      seen.add(source.id);
      return true;
    })
    .slice(0, 3);
  if (!sources.length) return base;
  const estimates = sources.map((row) => {
    const source = candidateForExercise(row.exercise)!;
    const work = row.sets.filter(
      (a) => a.kind === "work" && a.weight > 0 && a.reps >= 3 && a.reps <= 20,
    );
    return (
      median(
        work.map(
          (a) =>
            ((a.weight * units(source)) / units(target)) *
            Math.min(1, (1 + a.reps / 30) / (1 + e.minReps / 30)),
        ),
      ) * (age(row.workout.date, today) > 14 ? 0.9 : 1)
    );
  });
  const basis = median(estimates),
    weight = down(basis * 0.6, step);
  if (weight <= 0) return base;
  return {
    ...base,
    kind: "estimate",
    sources,
    weight,
    range: [
      Math.max(step, down(basis * 0.5, step)),
      Math.max(weight, down(basis * 0.7, step)),
    ],
    canApply: true,
    reason:
      "Približna uvodna ocena iz sorodnih vaj za iste mišice. Zanesljivost je nizka; preveri z lahko uvodno serijo in prilagodi glede na izvedbo. To ni izmerjena zmogljivost ali pretvorba kilogramov med napravami.",
  };
}

/** Changes only the unfinished plan. Applying advice never marks a set done. */
export function applyLoadAdvice(e: Exercise, advice: LoadAdvice): Exercise {
  if (!advice.canApply || advice.weight === undefined) return e;
  let index = -1;
  return {
    ...e,
    sets: e.sets.map((set) => {
      if (set.kind === "warmup") return set;
      index++;
      if (set.done) return set;
      const reference =
        advice.kind === "last"
          ? advice.last?.sets[Math.min(index, advice.last.sets.length - 1)]
          : undefined;
      return {
        ...set,
        weight: reference?.weight ?? advice.weight!,
        reps: reference?.reps ?? advice.reps,
        loadPending: false,
      };
    }),
  };
}
/** Only called on an explicit NEW workout, never on loading/upgrading a database. */
export function prepareWorkoutLoads(s: State, workout: Workout): Workout {
  return {
    ...workout,
    exercises: workout.exercises.map((e) => {
      if (e.coach || e.cardio) return e;
      const advice = loadAdvice(s, e, workout.date, workout.id);
      return advice.kind === "last" && advice.automatic
        ? applyLoadAdvice(e, advice)
        : e;
    }),
  };
}
export function exerciseFromCatalog(s: State, c: Candidate): Exercise {
  const pref = s.coach?.preferences[c.id];
  const e: Exercise = {
    ...newExercise(c.name),
    id: c.id,
    mode: c.mode ?? "machine",
    equipment: pref?.identity || c.equipment,
    increment: pref?.increment ?? (c.mode === "dumbbell" ? 1 : 2.5),
    sets: Array.from({ length: 3 }, () => ({
      ...emptySet(),
      loadPending: c.mode !== "bodyweight",
    })),
  };
  const last = lastRecorded(s, e);
  if (last && last.exercise.mode === e.mode) {
    e.equipment = last.exercise.equipment;
    e.confirmed = last.exercise.confirmed;
    e.increment = last.exercise.increment;
    e.minReps = last.exercise.minReps;
    e.maxReps = last.exercise.maxReps;
    e.rest = last.exercise.rest;
  }
  const advice = loadAdvice(s, e);
  return advice.automatic ? applyLoadAdvice(e, advice) : e;
}

export function completeQuickSet(e: Exercise, setId: string): Exercise {
  const set = e.sets.find((s) => s.id === setId);
  if (
    !set ||
    set.done ||
    set.loadPending ||
    set.reps <= 0 ||
    !Number.isInteger(set.reps) ||
    !Number.isFinite(set.weight) ||
    set.weight < 0
  )
    return e;
  const index = e.sets.indexOf(set);
  return {
    ...e,
    sets: e.sets.map((s, i) =>
      s.id === setId
        ? { ...s, done: true }
        : i > index &&
            !s.done &&
            s.loadPending &&
            set.kind === "work" &&
            s.kind === "work"
          ? { ...s, weight: set.weight, reps: set.reps, loadPending: false }
          : s,
    ),
  };
}
