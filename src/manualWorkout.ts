import {
  emptySet,
  localDate,
  newExercise,
  uid,
  type Exercise,
  type LiftSet,
  type State,
  type Workout,
} from "./model";

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T12:00:00Z");
  return (
    Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value
  );
}
export function newManualSet(): LiftSet {
  return { ...emptySet(), weight: 0, reps: 0, done: false, loadPending: true };
}
export function newManualExercise(source?: Exercise, name = ""): Exercise {
  const exercise = source ? structuredClone(source) : newExercise(name.trim());
  return {
    ...exercise,
    sets: [newManualSet()],
    note: "",
    pain: false,
    confirmed: false,
    coach: undefined,
  };
}
export function createManualWorkoutDraft(today = localDate()): Workout {
  if (!isCalendarDate(today)) throw Error("Izberi veljaven datum.");
  return {
    id: uid(),
    date: today,
    name: "Trening za nazaj",
    splitId: "manual-retrospective",
    exercises: [],
    durationMin: 0,
    reviewDuration: true,
    note: "",
    source: "manual",
    entryMode: "retrospective",
  };
}
export function copyManualSet(set: LiftSet): LiftSet {
  return { ...set, id: uid(), done: false };
}
export function finishManualWorkout(
  draft: Workout,
  today = localDate(),
  recordedAt = new Date().toISOString(),
): Workout {
  if (!isCalendarDate(draft.date) || draft.date > today)
    throw Error("Izberi datum danes ali v preteklosti.");
  if (!draft.name.trim() || draft.name.trim().length > 120)
    throw Error("Vpiši ime treninga (največ 120 znakov).");
  if (!draft.exercises.length) throw Error("Dodaj vsaj eno opravljeno vajo.");
  if (
    !Number.isInteger(draft.durationMin) ||
    draft.durationMin < 0 ||
    draft.durationMin > 1440
  )
    throw Error("Trajanje mora biti med 1 in 1440 minutami ali ostati prazno.");
  if (new Set(draft.exercises.map((e) => e.id)).size !== draft.exercises.length)
    throw Error("Ista vaja je dodana večkrat. Njene serije zapiši skupaj.");
  const allSets = draft.exercises.flatMap((e) => e.sets);
  if (new Set(allSets.map((s) => s.id)).size !== allSets.length)
    throw Error("Serije morajo imeti ločene zapise.");
  for (const exercise of draft.exercises) {
    if (!exercise.name.trim()) throw Error("Vsaka vaja potrebuje ime.");
    if (!exercise.sets.length)
      throw Error(`${exercise.name}: dodaj vsaj eno opravljeno serijo.`);
    for (const [i, set] of exercise.sets.entries()) {
      if (
        !exercise.cardio &&
        (set.loadPending ||
          !Number.isFinite(set.weight) ||
          set.weight < 0 ||
          set.weight > 9999)
      )
        throw Error(
          `${exercise.name}, serija ${i + 1}: vpiši dejansko težo; 0 pomeni brez dodatne obremenitve.`,
        );
      if (
        !Number.isInteger(set.reps) ||
        set.reps < 1 ||
        set.reps > (exercise.cardio ? 1440 : 999)
      )
        throw Error(
          `${exercise.name}, serija ${i + 1}: vpiši dejanske ponovitve oziroma minute.`,
        );
      if (
        set.rir !== undefined &&
        (!Number.isInteger(set.rir) || set.rir < 0 || set.rir > 10)
      )
        throw Error(
          `${exercise.name}, serija ${i + 1}: RIR naj bo med 0 in 10 ali prazen.`,
        );
    }
  }
  // The date and optional duration are known; do not invent start/end clock times.
  const {
    startedAt: _start,
    finishedAt: _end,
    restUntil: _rest,
    ...rest
  } = draft as Workout & { restUntil?: number };
  return {
    ...rest,
    name: draft.name.trim(),
    source: "manual",
    entryMode: "retrospective",
    recordedAt,
    modifiedAt: recordedAt,
    reviewDuration: draft.durationMin <= 1,
    exercises: draft.exercises.map((e) => ({
      ...e,
      name: e.name.trim(),
      sets: e.sets.map((s) => ({ ...s, done: true, loadPending: false })),
    })),
  };
}
export function commitManualWorkout(state: State, today = localDate()): State {
  if (!state.manualWorkoutDraft) throw Error("Naknadni vnos ni odprt.");
  const record = finishManualWorkout(state.manualWorkoutDraft, today);
  if (state.workouts.some((w) => w.id === record.id))
    throw Error("Ta trening je že shranjen.");
  return {
    ...state,
    workouts: [...state.workouts, record],
    manualWorkoutDraft: undefined,
  };
}
