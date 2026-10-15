import {
  initialState,
  newExercise,
  records,
  streak,
  uid,
  type State,
  type Workout,
  type Measurement,
  type Daily,
  type ImportBatch,
  type Change,
} from "./model";
type Obj = Record<string, any>;
const object = (v: unknown, label: string): Obj => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw Error(`${label}: pričakovan objekt.`);
  return v as Obj;
};
const array = (v: unknown, label: string): any[] => {
  if (!Array.isArray(v)) throw Error(`${label}: pričakovan seznam.`);
  return v;
};
function date(v: unknown) {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    new Date(v + "T12:00:00Z").toISOString().slice(0, 10) !== v
  )
    throw Error("Neveljaven koledarski datum.");
  return v;
}
function number(v: unknown, label: string, min = 0) {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min)
    throw Error(`${label}: neveljavna številka.`);
  return v;
}
export function canonical(x: unknown): string {
  if (x === undefined) return "undefined";
  if (x === null || typeof x !== "object") return JSON.stringify(x);
  if (Array.isArray(x)) return "[" + x.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.entries(x)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
      .join(",") +
    "}"
  );
}
function sameRaw(a: Obj, b: Obj) {
  return canonical(a.raw) === canonical(b.raw);
}
export interface Preview {
  raw: Obj;
  workouts: Workout[];
  measurements: Measurement[];
  daily: Daily[];
  cardio: Obj[];
  warnings: string[];
  stats: {
    workouts: number;
    sets: number;
    done: number;
    exercises: number;
    weight: number;
    waist: number;
    daily: number;
    cardio: number;
  };
  conflicts: { collection: Change["collection"]; id: string; label: string }[];
  duplicates: number;
}
export function previewPulse(text: string, current: State): Preview {
  const raw = object(JSON.parse(text), "Datoteka");
  if (raw.version !== 1 || raw.source !== "pulse-v3")
    throw Error("Pričakovana je datoteka pulse-v3, različica 1.");
  const s = object(raw.state, "state");
  object(s.profile, "profile");
  const warnings = [
    "Način obremenitve, vrsta serije, RIR in točna naprava v zgodovini niso znani.",
    "Profil zahteva potrditev. Meritve profila brez datuma ne bodo dodane v grafe.",
    "Apple Health: ni povezano. Stara ura je ročni vir.",
    "daily.hr ima neznan pomen. Ničle aktivnosti so ohranjene brez razlage.",
    "effort.score, zone in trimp so stari izračuni z neznano metodo; niso RIR.",
  ];
  const workouts = array(s.workoutLogs, "workoutLogs").map((v, i): Workout => {
    const w = object(v, "Trening");
    if (typeof w.id !== "string" || !w.id)
      throw Error("Trening brez izvornega ID.");
    const day = date(w.date);
    const duration = number(w.durationMin, "Trajanje");
    if (duration <= 1)
      warnings.push(
        `${day}: trajanje ${duration} min zahteva preverjanje in je izločeno iz povzetkov trajanja.`,
      );
    return {
      id: "pulse:workout:" + w.id,
      source: "pulse-v3",
      sourceId: w.id,
      raw: v,
      date: day,
      name: String(w.dayName ?? w.splitId ?? "Trening"),
      splitId: String(w.splitId ?? "unknown"),
      durationMin: duration,
      reviewDuration: duration <= 1,
      avgHr: w.avgHr === undefined ? undefined : number(w.avgHr, "Utrip"),
      note: "",
      exercises: array(w.exercises, "Vaje").map((ev, j) => {
        const e = object(ev, "Vaja");
        if (typeof e.exerciseId !== "string" || !e.exerciseId)
          throw Error("Vaja brez exerciseId.");
        return {
          ...newExercise(String(e.name ?? e.exerciseId)),
          id: e.exerciseId,
          sets: array(e.sets, "Serije").map((sv, k) => {
            const a = object(sv, "Serija");
            if (typeof a.done !== "boolean")
              throw Error("Serija brez logične vrednosti done.");
            const reps = number(a.reps, "Ponovitve");
            if (!Number.isInteger(reps))
              throw Error("Ponovitve morajo biti celo število.");
            return {
              id: `pulse-${i}-${j}-${k}`,
              weight: number(a.weight, "Obremenitev"),
              reps,
              done: a.done,
              kind: "unknown" as const,
            };
          }),
        };
      }),
    };
  });
  const measurements: Measurement[] = (["weight", "waist"] as const).flatMap(
    (kind) =>
      array(s[kind === "weight" ? "weightLogs" : "waistLogs"], kind).map(
        (v) => {
          const m = object(v, "Meritev");
          const d = date(m.date);
          const sourceId = typeof m.id === "string" ? m.id : d;
          return {
            id: `pulse:${kind}:${sourceId}`,
            source: "pulse-v3",
            sourceId,
            raw: v,
            date: d,
            value: number(m[kind === "weight" ? "kg" : "cm"], "Meritev", 0.01),
            kind,
          };
        },
      ),
  );
  const daily: Daily[] = array(s.daily, "daily").map((v) => {
    const d = object(v, "Dnevni zapis");
    const day = date(d.date);
    for (const key of ["steps", "hr", "moveKcal", "exerciseMin", "standHours"])
      if (d[key] !== undefined) number(d[key], key);
    return {
      id: `pulse:daily:${d.id ?? day}`,
      date: day,
      source: "pulse-v3",
      sourceId: String(d.id ?? day),
      raw: v,
      steps: d.steps,
      hr: d.hr,
      moveKcal: d.moveKcal,
      exerciseMin: d.exerciseMin,
      standHours: d.standHours,
    };
  });
  const cardio: Obj[] = array(s.cardioLogs, "cardioLogs").map((v) => {
    const c = object(v, "Kardio");
    date(c.date);
    return {
      ...c,
      id: `pulse:cardio:${c.id ?? c.date}`,
      sourceId: String(c.id ?? c.date),
      raw: v,
    };
  });
  for (const [label, rows] of Object.entries({
    workouts,
    measurements,
    daily,
    cardio,
  })) {
    if (new Set(rows.map((r) => r.id)).size !== rows.length)
      throw Error(`Podvojeni izvorni ID v zbirki ${label}. Uvoz ni varen.`);
  }
  const temp = { ...initialState(), workouts };
  const recalculated = records(temp);
  let differences = 0;
  for (const [id, b] of Object.entries(
    object(s.bestLoads ?? {}, "bestLoads"),
  )) {
    const old = object(b, "bestLoad");
    const candidates = recalculated.filter((r) => r.exercise.id === id);
    const max = candidates.sort(
      (a, b) => b.weight - a.weight || b.reps - a.reps,
    )[0];
    if (
      !max ||
      max.weight !== old.weight ||
      max.reps !== old.reps ||
      max.date !== old.date
    )
      differences++;
  }
  warnings.push(
    `Preverjanje bestLoads: ${differences} razlik glede na največjo opravljeno obremenitev (pri izenačenju več ponovitev). Rekordi v aplikaciji se izračunajo po številu ponovitev.`,
  );
  warnings.push(
    `Zaporedje se izračuna na novo: ${streak(workouts)} zaporednih tednov z vsaj enim opravljenim treningom do tekočega ali preteklega tedna. Stara vrednost: ${String(s.streak)}.`,
  );
  const stats = {
    workouts: workouts.length,
    sets: workouts.reduce(
      (n, w) => n + w.exercises.reduce((a, e) => a + e.sets.length, 0),
      0,
    ),
    done: workouts.reduce(
      (n, w) =>
        n +
        w.exercises.reduce(
          (a, e) => a + e.sets.filter((s) => s.done).length,
          0,
        ),
      0,
    ),
    exercises: new Set(workouts.flatMap((w) => w.exercises.map((e) => e.id)))
      .size,
    weight: measurements.filter((m) => m.kind === "weight").length,
    waist: measurements.filter((m) => m.kind === "waist").length,
    daily: daily.length,
    cardio: cardio.length,
  };
  for (const [key, expected] of Object.entries({
    workouts: 12,
    sets: 149,
    exercises: 17,
    weight: 10,
    waist: 8,
    daily: 3,
    cardio: 0,
  })) {
    if (stats[key as keyof typeof stats] !== expected)
      warnings.push(
        `Razlika od opisa: ${key} = ${stats[key as keyof typeof stats]}, pričakovano ${expected}.`,
      );
  }
  const conflicts: Preview["conflicts"] = [];
  let duplicates = 0;
  for (const [key, rows] of Object.entries({
    workouts,
    measurements,
    daily,
    cardio,
  })) {
    for (const r of rows) {
      const existing = (current[key as Change["collection"]] as Obj[]).find(
        (x) => x.id === r.id,
      );
      if (existing) {
        if (sameRaw(existing, r)) duplicates++;
        else
          conflicts.push({
            collection: key as Change["collection"],
            id: r.id,
            label: `${key}: ${r.date} · ${r.sourceId}`,
          });
      }
    }
  }
  return {
    raw,
    workouts,
    measurements,
    daily,
    cardio,
    warnings,
    stats,
    conflicts,
    duplicates,
  };
}
export function applyPulse(
  state: State,
  p: Preview,
  replaceIds: string[] = [],
): State {
  const next = structuredClone(state);
  const id = uid();
  const changes: Change[] = [];
  for (const key of ["workouts", "measurements", "daily", "cardio"] as const) {
    const target = next[key] as Obj[];
    for (const r of p[key]) {
      const at = target.findIndex((v) => v.id === r.id);
      if (at >= 0 && (!replaceIds.includes(r.id) || sameRaw(target[at], r)))
        continue;
      const item = { ...r, batchId: id };
      changes.push({
        collection: key,
        id: r.id,
        before: at >= 0 ? structuredClone(target[at]) : undefined,
        after: canonical(item),
      });
      if (at >= 0) target[at] = item;
      else target.push(item);
    }
  }
  if (!changes.length) return next;
  const batch: ImportBatch = {
    id,
    at: new Date().toISOString(),
    source: "pulse-v3 · ročni uvoz",
    raw: p.raw,
    warnings: p.warnings,
    changes,
  };
  if (!next.profile.confirmed && !next.imports.some((i) => !i.undone)) {
    batch.profileBefore = structuredClone(next.profile);
    const p0 = p.raw.state.profile;
    next.profile = {
      ...next.profile,
      name: typeof p0.name === "string" ? p0.name : "",
      age: typeof p0.age === "number" ? p0.age : undefined,
      heightCm: typeof p0.heightCm === "number" ? p0.heightCm : undefined,
      weightKg: typeof p0.weightKg === "number" ? p0.weightKg : undefined,
      waistCm: typeof p0.waistCm === "number" ? p0.waistCm : undefined,
      confirmed: false,
    };
    batch.profileAfter = canonical(next.profile);
  }
  next.imports.push(batch);
  return next;
}
export function undoImport(
  state: State,
  batchId: string,
): { state: State; preserved: number } {
  const next = structuredClone(state);
  const batch = next.imports.find((b) => b.id === batchId);
  if (!batch || batch.undone) return { state: next, preserved: 0 };
  let preserved = 0;
  for (const c of batch.changes) {
    const rows = next[c.collection] as Obj[];
    const at = rows.findIndex((r) => r.id === c.id);
    if (at < 0) continue;
    if (canonical(rows[at]) !== c.after) {
      preserved++;
      continue;
    }
    if (c.before) rows[at] = c.before;
    else rows.splice(at, 1);
  }
  if (batch.profileBefore && canonical(next.profile) === batch.profileAfter)
    next.profile = batch.profileBefore;
  batch.undone = true;
  return { state: next, preserved };
}
