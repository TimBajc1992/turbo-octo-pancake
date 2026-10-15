import { validateHealthBridge } from "./healthShortcuts";
import { validateCoachData } from "./coach";
import { initialState, type State } from "./model";
const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("tezisce", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("state");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
export async function loadState(): Promise<State> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction("state").objectStore("state").get("current");
      r.onsuccess = () => resolve(r.result ?? initialState());
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
export async function saveState(state: State, expected?: State) {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("state", "readwrite");
      const store = tx.objectStore("state");
      let conflict: Error | undefined;
      if (expected) {
        const read = store.get("current");
        read.onsuccess = () => {
          if (
            read.result !== undefined &&
            JSON.stringify(read.result) !== JSON.stringify(expected)
          ) {
            conflict = Error(
              "Podatki so se spremenili v drugem zavihku. Izvozi kopijo trenutnih sprememb in ponovno odpri aplikacijo, preden nadaljuješ.",
            );
            tx.abort();
          } else store.put(state, "current");
        };
      } else store.put(state, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(conflict ?? tx.error);
      tx.onabort = () => reject(conflict ?? tx.error);
    });
  } finally {
    db.close();
  }
}
export function backup(state: State) {
  return JSON.stringify(
    {
      format: "tezisce-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      state,
    },
    null,
    2,
  );
}
function validateState(value: unknown): asserts value is State {
  const fail = () => {
    throw Error(
      "Varnostna kopija vsebuje neveljavne ali nepopolne podatke. Trenutni podatki niso bili spremenjeni.",
    );
  };
  const obj = (v: any) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) fail();
    return v;
  };
  const arr = (v: any) => {
    if (!Array.isArray(v)) fail();
    return v as any[];
  };
  const str = (v: any) => {
    if (typeof v !== "string") fail();
  };
  const finite = (v: any, min = 0) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min) fail();
  };
  const bool = (v: any) => {
    if (typeof v !== "boolean") fail();
  };
  const day = (v: any) => {
    str(v);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
      new Date(v + "T12:00:00Z").toISOString().slice(0, 10) !== v
    )
      fail();
  };
  const exercise = (v: any) => {
    const e = obj(v);
    for (const k of ["id", "name", "equipment", "note"]) str(e[k]);
    if (
      ![
        "unknown",
        "barbell",
        "dumbbell",
        "machine",
        "bodyweight",
        "assisted",
      ].includes(e.mode)
    )
      fail();
    bool(e.pain);
    bool(e.confirmed);
    if (e.coach !== undefined) {
      const c = obj(e.coach);
      for (const k of ["catalogId", "slotId", "rom", "seat", "reason"])
        str(c[k]);
      if (!["lower", "upper", "full"].includes(c.group)) fail();
      bool(c.calibration);
      for (const k of ["retired", "formGood", "trialLogged", "stepConfirmed"])
        if (c[k] !== undefined) bool(c[k]);
      if (c.convention !== undefined) str(c.convention);
      if (c.trialDraft !== undefined) {
        const d = obj(c.trialDraft);
        for (const k of ["weight", "reps", "rir"])
          if (d[k] !== undefined) finite(d[k]);
        for (const k of ["formGood", "pain"])
          if (d[k] !== undefined) bool(d[k]);
      }
    }

    for (const k of ["minReps", "maxReps", "rest"]) finite(e[k]);
    finite(e.increment, 0.1);
    if (e.minReps > e.maxReps) fail();
    arr(e.sets).forEach((a) => {
      obj(a);
      str(a.id);
      finite(a.weight);
      finite(a.reps);
      if (!Number.isInteger(a.reps)) fail();
      bool(a.done);
      if (a.loadPending !== undefined) {
        bool(a.loadPending);
        if (a.done && a.loadPending) fail();
      }
      if (!["unknown", "work", "warmup"].includes(a.kind)) fail();
      if (a.rir !== undefined) {
        finite(a.rir);
        if (a.rir > 10) fail();
      }
    });
  };
  const workout = (v: any) => {
    const w = obj(v);
    for (const k of ["id", "name", "splitId", "note"]) str(w[k]);
    day(w.date);
    finite(w.durationMin);
    bool(w.reviewDuration);
    arr(w.exercises).forEach(exercise);
    if (w.startedAt !== undefined) finite(w.startedAt);
    if (w.finishedAt !== undefined) finite(w.finishedAt);
  };
  const s = obj(value);
  if (s.schema !== 1) fail();
  finite(s.nextTemplate);
  if (!Number.isInteger(s.nextTemplate)) fail();
  if (s.coach !== undefined) validateCoachData(s.coach);
  if (s.healthBridge !== undefined) validateHealthBridge(s.healthBridge);
  const p = obj(s.profile);
  for (const k of ["name", "goal", "equipment", "experience", "limitations"])
    str(p[k]);
  bool(p.confirmed);
  finite(p.time);
  if (!["days", "flexible"].includes(p.schedule)) fail();
  arr(p.days).forEach((d) => {
    if (!Number.isInteger(d) || d < 0 || d > 6) fail();
  });
  for (const k of [
    "age",
    "heightCm",
    "weightKg",
    "waistCm",
    "targetWeight",
    "weeklyGoal",
  ])
    if (p[k] !== undefined) finite(p[k]);
  arr(s.workouts).forEach(workout);
  if (s.active !== undefined) workout(s.active);
  if (s.restUntil !== undefined) finite(s.restUntil);
  arr(s.templates).forEach((t) => {
    obj(t);
    str(t.id);
    str(t.name);
    arr(t.exercises).forEach(exercise);
  });
  arr(s.measurements).forEach((m) => {
    obj(m);
    str(m.id);
    day(m.date);
    finite(m.value, 0.01);
    if (!["weight", "waist"].includes(m.kind)) fail();
  });
  arr(s.daily).forEach((d) => {
    obj(d);
    str(d.id);
    day(d.date);
    for (const k of ["steps", "hr", "moveKcal", "exerciseMin", "standHours"])
      if (d[k] !== undefined) finite(d[k]);
  });
  arr(s.cardio).forEach((c) => {
    obj(c);
    str(c.id);
    day(c.date);
  });
  arr(s.imports).forEach((b) => {
    obj(b);
    str(b.id);
    str(b.source);
    str(b.at);
    arr(b.warnings).forEach(str);
    arr(b.changes).forEach((c) => {
      obj(c);
      str(c.id);
      str(c.after);
      if (
        !["workouts", "measurements", "daily", "cardio"].includes(c.collection)
      )
        fail();
    });
  });
  for (const rows of [
    s.workouts,
    s.templates,
    s.measurements,
    s.daily,
    s.cardio,
    s.imports,
  ])
    if (new Set(rows.map((r: any) => r.id)).size !== rows.length) fail();
}
export function restoreBackup(text: string): State {
  const v = JSON.parse(text);
  if (v.format !== "tezisce-backup" || v.version !== 1)
    throw Error("Nepodprta oblika varnostne kopije.");
  validateState(v.state);
  return v.state;
}

/** Device-only credentials and merge baseline are never included in State or exported backups. */
export async function readDeviceValue<T>(key: string): Promise<T | undefined> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const query = db
        .transaction("state")
        .objectStore("state")
        .get("device:" + key);
      query.onsuccess = () => resolve(query.result);
      query.onerror = () => reject(query.error);
    });
  } finally {
    db.close();
  }
}
export async function writeDeviceValue(
  key: string,
  value: unknown,
): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("state", "readwrite"),
        store = tx.objectStore("state");
      if (value === undefined) store.delete("device:" + key);
      else store.put(value, "device:" + key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function keepSyncSafetyCopy(state: State): Promise<void> {
  const saved =
    (await readDeviceValue<{ at: string; state: State }[]>("sync-safety")) ??
    [];
  await writeDeviceValue(
    "sync-safety",
    [
      { at: new Date().toISOString(), state: structuredClone(state) },
      ...saved,
    ].slice(0, 5),
  );
}
