import type { HealthBridge } from "./healthShortcuts";
import type { CoachConfig, CheckIn } from "./coach";
export type LoadMode =
  "unknown" | "barbell" | "dumbbell" | "machine" | "bodyweight" | "assisted";
export type SetKind = "unknown" | "warmup" | "work";
export interface LiftSet {
  id: string;
  weight: number;
  reps: number;
  done: boolean;
  kind: SetKind;
  rir?: number;
  loadPending?: boolean;
}
export interface Exercise {
  id: string;
  name: string;
  mode: LoadMode;
  equipment: string;
  sets: LiftSet[];
  note: string;
  pain: boolean;
  minReps: number;
  maxReps: number;
  increment: number;
  rest: number;
  confirmed: boolean;
  cardio?: boolean;
  coach?: {
    catalogId: string;
    slotId: string;
    group: "lower" | "upper" | "full";
    rom: string;
    seat: string;
    reason: string;
    calibration: boolean;
    convention?: string;
    stepConfirmed?: boolean;
    trialDraft?: {
      weight?: number;
      reps?: number;
      rir?: number;
      formGood?: boolean;
      pain?: boolean;
    };
    trialLogged?: boolean;
    retired?: boolean;
    formGood?: boolean;
  };
}
export interface Provenance {
  source?: "manual" | "pulse-v3" | "healthkit" | "apple-shortcuts";
  externalId?: string;
  measuredAt?: string;
  syncedAt?: string;
  batchId?: string;
  sourceId?: string;
  raw?: unknown;
  modifiedAt?: string;
}
export interface Workout extends Provenance {
  coach?: {
    group: "lower" | "upper" | "full";
    mode: string;
    reason: string;
    checkIn: CheckIn;
    generatedAt: string;
  };
  cardioPlan?: {
    type: string;
    minutes: number;
    warmup: number;
    cooldown: number;
    incline: number;
    intervals: boolean;
    intensity: string;
  };
  id: string;
  date: string;
  name: string;
  splitId: string;
  exercises: Exercise[];
  startedAt?: number;
  finishedAt?: number;
  durationMin: number;
  reviewDuration: boolean;
  avgHr?: number;
  note: string;
}
export interface Measurement extends Provenance {
  id: string;
  date: string;
  value: number;
  kind: "weight" | "waist";
}
export interface Daily extends Provenance {
  id: string;
  date: string;
  steps?: number;
  hr?: number;
  moveKcal?: number;
  exerciseMin?: number;
  standHours?: number;
  sleepHours?: number;
  note?: string;
}
export interface Profile {
  name: string;
  goal: string;
  time: number;
  equipment: string;
  experience: string;
  limitations: string;
  confirmed: boolean;
  targetWeight?: number;
  weeklyGoal?: number;
  schedule: "flexible" | "days";
  days: number[];
  age?: number;
  heightCm?: number;
  weightKg?: number;
  waistCm?: number;
}
export interface Template {
  id: string;
  name: string;
  exercises: Exercise[];
}
export interface Change {
  collection: "workouts" | "measurements" | "daily" | "cardio";
  id: string;
  before?: unknown;
  after: string;
}
export interface ImportBatch {
  id: string;
  at: string;
  source: string;
  raw: unknown;
  warnings: string[];
  changes: Change[];
  profileBefore?: Profile;
  profileAfter?: string;
  undone?: boolean;
}
export interface State {
  schema: 1;
  profile: Profile;
  workouts: Workout[];
  measurements: Measurement[];
  daily: Daily[];
  cardio: Record<string, unknown>[];
  templates: Template[];
  active?: Workout;
  restUntil?: number;
  imports: ImportBatch[];
  nextTemplate: number;
  coach?: CoachConfig;
  healthBridge?: HealthBridge;
}
export const uid = () => crypto.randomUUID();
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function dateLabel(s: string, long = false) {
  return new Date(s + "T12:00:00").toLocaleDateString(
    "sl-SI",
    long
      ? { day: "numeric", month: "long", year: "numeric" }
      : { day: "numeric", month: "short" },
  );
}
export const num = (n: number, d = 1) =>
  n.toLocaleString("sl-SI", { maximumFractionDigits: d });
export const modes: Record<LoadMode, string> = {
  unknown: "Neznan način",
  barbell: "Palica · skupna teža",
  dumbbell: "Ročki · teža ene ročke",
  machine: "Naprava",
  bodyweight: "Lastna teža · dodatna kg",
  assisted: "Asistenca · kg pomoči",
};
export const emptySet = (): LiftSet => ({
  id: uid(),
  weight: 0,
  reps: 10,
  done: false,
  kind: "work",
});
export function newExercise(name = "Nova vaja"): Exercise {
  return {
    id: uid(),
    name,
    mode: "unknown",
    equipment: "",
    sets: [emptySet(), emptySet(), emptySet()],
    note: "",
    pain: false,
    minReps: 8,
    maxReps: 12,
    increment: 2.5,
    rest: 90,
    confirmed: false,
  };
}
/** Copy a plan without carrying proof of performance into a new workout. */
export function plannedExercise(e: Exercise): Exercise {
  return {
    ...structuredClone(e),
    note: "",
    pain: false,
    coach: e.coach
      ? {
          ...e.coach,
          slotId: uid(),
          formGood: false,
          retired: false,
          trialDraft: undefined,
          trialLogged: false,
        }
      : undefined,
    sets: e.sets.map((s) => ({ ...s, id: uid(), done: false, rir: undefined })),
  };
}
export const initialState = (): State => ({
  schema: 1,
  profile: {
    name: "",
    goal: "",
    time: 60,
    equipment: "",
    experience: "",
    limitations: "",
    confirmed: false,
    schedule: "flexible",
    days: [],
  },
  workouts: [],
  measurements: [],
  daily: [],
  cardio: [],
  templates: ["Legs", "Push", "Pull", "Upper"].map((name) => ({
    id: uid(),
    name,
    exercises: [],
  })),
  imports: [],
  nextTemplate: 0,
});
export const completeSets = (w: Workout) =>
  w.exercises.flatMap((e) => (e.cardio ? [] : e.sets.filter((s) => s.done)));
export function comparable(a: Exercise, b: Exercise) {
  return (
    a.mode !== "unknown" &&
    b.mode !== "unknown" &&
    !!a.equipment.trim() &&
    !!b.equipment.trim() &&
    (!(a.coach || b.coach) ||
      (!!a.coach?.rom &&
        a.coach.rom === b.coach?.rom &&
        a.coach.convention === b.coach?.convention)) &&
    a.id === b.id &&
    a.mode === b.mode &&
    a.equipment === b.equipment
  );
}
export function lastExercise(state: State, e: Exercise, before = localDate()) {
  return state.workouts
    .filter((w) => w.date <= before)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.finishedAt ?? 0) - (a.finishedAt ?? 0),
    )
    .flatMap((w) =>
      w.exercises
        .filter((x) => comparable(x, e) && x.sets.some((s) => s.done))
        .map((x) => ({ exercise: x, date: w.date })),
    )
    .at(0);
}
export function suggestion(
  state: State,
  e: Exercise,
): {
  weight: number;
  reps: number;
  reason: string;
  basis: string;
  canApply: boolean;
} {
  const last = lastExercise(state, e);
  const base = {
    weight: 0,
    reps: e.minReps,
    basis: "Ni primerljivega opravljenega treninga.",
    canApply: false,
  };
  if (!last)
    return { ...base, reason: "Najprej ročno izberi začetno obremenitev." };
  const sets = last.exercise.sets.filter((s) => s.done && s.kind === "work");
  const fallback = last.exercise.sets.find((s) => s.done)!;
  const weight = (sets.at(-1) ?? fallback).weight;
  const reps = (sets.at(-1) ?? fallback).reps;
  const basis = `${dateLabel(last.date, true)} · ${last.exercise.sets
    .filter((s) => s.done)
    .map((s) => `${num(s.weight)} kg × ${s.reps}`)
    .join(", ")}`;
  const out = { weight, reps, basis, canApply: false };
  if (e.pain || last.exercise.pain)
    return {
      ...out,
      reason:
        "Označena bolečina. Obremenitve ne povečuj; prilagodi ali prekini vajo in po potrebi poišči strokovni nasvet.",
    };
  if (!e.confirmed || e.mode === "unknown" || !sets.length)
    return {
      ...out,
      reason:
        "Potrdi način obremenitve, delovne serije in razpon ponovitev. Stari podatki niso dovolj za samodejen predlog.",
    };
  if (e.note || last.exercise.note)
    return {
      ...out,
      reason:
        "Vaja vsebuje opombo. Pred odločitvijo jo preglej; obremenitev ostaja enaka.",
      canApply: true,
    };
  const gap =
    (new Date(localDate() + "T12:00:00").getTime() -
      new Date(last.date + "T12:00:00").getTime()) /
    86400000;
  if (gap > 14)
    return {
      ...out,
      reason: `Od zadnje vaje je ${Math.floor(gap)} dni. Po premoru najprej preveri počutje z enako ali nižjo obremenitvijo.`,
      canApply: true,
    };
  if (sets.some((s) => s.rir !== undefined && s.rir < 2))
    return {
      ...out,
      reason: "Zabeležen RIR je pod 2. Najprej utrdi ponovitve pri isti teži.",
      canApply: true,
    };
  if (
    sets.length >= e.sets.filter((s) => s.kind === "work").length &&
    sets.every(
      (s) =>
        s.reps >= e.maxReps &&
        s.weight === weight &&
        s.rir !== undefined &&
        s.rir >= 2,
    )
  )
    return {
      ...out,
      weight:
        e.mode === "assisted"
          ? Math.max(0, weight - e.increment)
          : weight + e.increment,
      reps: e.minReps,
      reason:
        "Vse delovne serije dosegajo zgornji razpon in RIR ≥ 2. Predlagan je en potrjen korak obremenitve.",
      canApply: true,
    };
  return {
    ...out,
    reps: Math.min(e.maxReps, Math.max(e.minReps, reps)),
    reason:
      "Ohrani težo in najprej dosezi zgornji razpon v vseh serijah. Brez RIR ne sklepamo o preostali zmogljivosti.",
    canApply: true,
  };
}
export function weekStart(date = localDate()) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDate(d);
}
export function weeklyAverages(rows: Measurement[]) {
  const groups = new Map<string, number[]>();
  rows.forEach((r) => {
    const k = weekStart(r.date);
    groups.set(k, [...(groups.get(k) ?? []), r.value]);
  });
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      value: v.reduce((a, b) => a + b, 0) / v.length,
      count: v.length,
    }));
}
export function rolling(rows: Measurement[]) {
  return rows.map((r) => {
    const end = new Date(r.date + "T12:00:00").getTime();
    const window = rows.filter((x) => {
      const t = new Date(x.date + "T12:00:00").getTime();
      return t <= end && t > end - 7 * 86400000;
    });
    return {
      date: r.date,
      value: window.reduce((s, x) => s + x.value, 0) / window.length,
      count: window.length,
    };
  });
}
export function streak(workouts: Workout[]) {
  const weeks = new Set(
    workouts
      .filter((w) => completeSets(w).length)
      .map((w) => weekStart(w.date)),
  );
  let d = new Date(weekStart() + "T12:00:00");
  if (!weeks.has(localDate(d))) d.setDate(d.getDate() - 7);
  let n = 0;
  while (weeks.has(localDate(d))) {
    n++;
    d.setDate(d.getDate() - 7);
  }
  return n;
}
export const exerciseComparisonKey = (e: Exercise) =>
  JSON.stringify([
    e.id,
    e.mode,
    e.equipment,
    e.coach?.rom ?? "",
    e.coach?.convention ?? "",
  ]);
export function records(state: State) {
  const map = new Map<
    string,
    { exercise: Exercise; weight: number; reps: number; date: string }
  >();
  state.workouts.forEach((w) =>
    w.exercises
      .filter((e) => !e.cardio)
      .forEach((e) =>
        e.sets
          .filter((s) => s.done)
          .forEach((s) => {
            const key = exerciseComparisonKey(e) + ":" + s.reps;
            const prev = map.get(key);
            if (
              !prev ||
              (e.mode === "assisted"
                ? s.weight < prev.weight
                : s.weight > prev.weight)
            )
              map.set(key, {
                exercise: e,
                weight: s.weight,
                reps: s.reps,
                date: w.date,
              });
          }),
      ),
  );
  return [...map.values()];
}
export function nextSessionDate(
  profile: Profile,
  from = localDate(),
): string | undefined {
  if (profile.schedule !== "days" || !profile.days.length) return undefined;
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(from + "T12:00:00");
    d.setDate(d.getDate() + offset);
    if (profile.days.includes((d.getDay() + 6) % 7)) return localDate(d);
  }
  return undefined;
}
