import {
  dateLabel,
  emptySet,
  localDate,
  newExercise,
  num,
  uid,
  type Exercise,
  type State,
  type Workout,
  type LiftSet,
  type Template,
} from "./model";
export type Group = "lower" | "upper" | "full";
export type Readiness = "unknown" | "good" | "poor";
export interface CheckIn {
  date: string;
  minutes: number;
  energy: number;
  sleep: Readiness;
  soreness: "unknown" | "low" | "moderate" | "high";
  pain: boolean;
  ill: boolean;
  choice: "auto" | "strength" | "mixed" | "light" | "cardio" | "rest";
  note: string;
  confirmed: boolean;
  sleepHours?: number;
  stress?: number;
  muscleSoreness?: Partial<Record<Group, "low" | "moderate" | "high">>;
  extended?: boolean;
  group?: "auto" | Group;
  cardioType?: string;
  cardioMinutes?: number;
  incline?: number;
  intervals?: boolean;
  cardioComfortConfirmed?: boolean;
}
export interface DevicePreference {
  identity: string;
  convention?: string;
  rom: string;
  seat: string;
  comfort: "unknown" | "yes" | "no";
  favorite: boolean;
  excluded: boolean;
  increment: number;
}
export interface ProgramSlot {
  id: string;
  catalogId: string;
  sets: number;
  minReps: number;
  maxReps: number;
}
export interface HistoryLink {
  catalogId: string;
  device: string;
  rom: string;
  fingerprint: string;
  workingSetsConfirmed: boolean;
  convention?: string;
}
export interface CoachConfig {
  version: 1;
  confirmed: boolean;
  available: string[];
  joints: {
    knees: "unknown" | "none" | "issue";
    back: "unknown" | "none" | "issue";
    shoulders: "unknown" | "none" | "issue";
  };
  weekdayMinutes: number;
  weekendMinutes: number;
  saturdayMinutes?: number;
  sundayMinutes?: number;
  cardioEquipment?: string[];
  cardioExperience?: "new" | "regular";
  weeklySets: number;
  preferences: Record<string, DevicePreference>;
  programs: Partial<Record<Group, ProgramSlot[]>>;
  historyLinks: Record<string, HistoryLink>;
  reviewedChanges: Record<string, string>;
  checkIn?: CheckIn;
  rejected?: { date: string; reason: string };
  observations?: {
    metric: "hrvSDNN" | "restingHeartRate" | "sleepHours";
    value: number;
    source: "manual" | "healthkit" | "apple-shortcuts";
    measuredAt: string;
    context: "rest" | "breathing" | "unknown";
    quality: "unknown" | "valid";
    externalId?: string;
  }[];
}
export { catalog, byId, type Candidate } from "./exerciseCatalog";
import { catalog, byId } from "./exerciseCatalog";
export const defaultPreference = (): DevicePreference => ({
  identity: "",
  rom: "",
  seat: "",
  comfort: "unknown",
  favorite: false,
  excluded: false,
  increment: 2.5,
});
export const defaultCoach = (): CoachConfig => ({
  version: 1,
  confirmed: false,
  available: [],
  joints: { knees: "unknown", back: "unknown", shoulders: "unknown" },
  weekdayMinutes: 45,
  weekendMinutes: 75,
  weeklySets: 8,
  preferences: {},
  programs: {},
  historyLinks: {},
  reviewedChanges: {},
});
export const getCoach = (s: State) => s.coach ?? defaultCoach();
export const preference = (c: CoachConfig, id: string) =>
  c.preferences[id] ?? defaultPreference();
export const historyKey = (w: Workout, index: number) => `${w.id}:${index}`;
export const historyFingerprint = (w: Workout, e: Exercise) =>
  JSON.stringify([w.date, e]);
export function historicalEntries(s: State, id: string) {
  return s.workouts
    .flatMap((w) =>
      w.exercises
        .map((e, index) => ({ w, e, index, key: historyKey(w, index) }))
        .filter(
          ({ e }) =>
            e.id === id &&
            !e.cardio &&
            e.sets.some((a) => a.done && a.kind !== "warmup"),
        ),
    )
    .sort(
      (a, b) =>
        b.w.date.localeCompare(a.w.date) ||
        (b.w.finishedAt ?? 0) - (a.w.finishedAt ?? 0) ||
        s.workouts.indexOf(b.w) - s.workouts.indexOf(a.w),
    );
}
export function comparableHistory(s: State, id: string) {
  const c = getCoach(s),
    p = preference(c, id);
  if (!p.identity.trim() || !p.rom.trim() || !p.convention) return [];
  return historicalEntries(s, id).filter(({ w, e, key }) => {
    const link = c.historyLinks[key];
    return (
      (e.mode === (byId(id)?.mode ?? "machine") &&
        e.equipment === p.identity &&
        e.coach?.rom === p.rom &&
        e.coach?.convention === p.convention) ||
      (!!link &&
        link.catalogId === id &&
        link.device === p.identity &&
        link.rom === p.rom &&
        link.convention === p.convention &&
        link.workingSetsConfirmed &&
        link.fingerprint === historyFingerprint(w, e))
    );
  });
}
export function allowed(c: CoachConfig, id: string) {
  const p = preference(c, id),
    e = byId(id);
  return (
    !!e &&
    c.available.includes(id) &&
    !p.excluded &&
    p.comfort !== "no" &&
    !e.joints.some(
      (j) => c.joints[j] === "issue" && (p.comfort !== "yes" || !p.rom.trim()),
    )
  );
}
export function alternatives(s: State, id: string) {
  const c = getCoach(s),
    current = byId(id);
  if (!current) return [];
  return catalog
    .filter(
      (x) =>
        x.id !== id &&
        x.pattern === current.pattern &&
        x.muscles.some((m) => current.muscles.includes(m)) &&
        allowed(c, x.id),
    )
    .sort(
      (a, b) =>
        Number(preference(c, b.id).favorite) -
          Number(preference(c, a.id).favorite) ||
        Number(comparableHistory(s, b.id).length > 0) -
          Number(comparableHistory(s, a.id).length > 0) ||
        catalog.indexOf(a) - catalog.indexOf(b),
    );
}
export function weeklyVolume(s: State, today = localDate()) {
  const start = new Date(today + "T12:00:00");
  start.setDate(start.getDate() - 6);
  const from = localDate(start);
  const volume: Record<string, { known: number; unknown: number }> = {};
  s.workouts
    .filter((w) => w.date >= from && w.date <= today)
    .forEach((w) =>
      w.exercises.forEach((e, i) => {
        const cat = byId(e.id);
        if (!cat) return;
        const link = getCoach(s).historyLinks[historyKey(w, i)];
        const working =
          link?.workingSetsConfirmed &&
          link.fingerprint === historyFingerprint(w, e);
        for (const set of e.sets.filter((a) => a.done && a.kind !== "warmup"))
          for (const m of cat.muscles) {
            volume[m] ??= { known: 0, unknown: 0 };
            if (set.kind === "work" || working) volume[m].known++;
            else volume[m].unknown++;
          }
      }),
    );
  return volume;
}
const patterns: Record<Group, string[]> = {
  lower: [
    "leg-push",
    "knee-flexion",
    "calf",
    "hip-extension",
    "knee-extension",
    "trunk",
  ],
  upper: [
    "horizontal-push",
    "horizontal-pull",
    "vertical-pull",
    "rear-delt",
    "elbow-extension",
    "elbow-flexion",
    "lateral-raise",
    "vertical-push",
    "chest-fly",
  ],
  full: [
    "leg-push",
    "horizontal-pull",
    "horizontal-push",
    "knee-flexion",
    "vertical-pull",
    "trunk",
    "calf",
  ],
};
export function createProgram(s: State, group: Group): ProgramSlot[] {
  const c = getCoach(s);
  return patterns[group].flatMap((pattern, index) => {
    const options = catalog
      .filter((x) => x.pattern === pattern && allowed(c, x.id))
      .sort(
        (a, b) =>
          Number(preference(c, b.id).favorite) -
            Number(preference(c, a.id).favorite) ||
          Number(historicalEntries(s, b.id).length > 0) -
            Number(historicalEntries(s, a.id).length > 0) ||
          catalog.indexOf(a) - catalog.indexOf(b),
      );
    const first = options[0];
    return first
      ? [
          {
            id: `${group}-${index}`,
            catalogId: first.id,
            sets: s.profile.experience === "Začetnik" ? 2 : 3,
            maxReps: [
              "leg-push",
              "horizontal-push",
              "horizontal-pull",
              "vertical-pull",
              "vertical-push",
            ].includes(pattern)
              ? 12
              : 15,
            minReps: [
              "leg-push",
              "horizontal-push",
              "horizontal-pull",
              "vertical-pull",
              "vertical-push",
            ].includes(pattern)
              ? 8
              : 10,
          },
        ]
      : [];
  });
}
/** A starting selection for review, never evidence that a particular gym has this equipment. */
export const suggestedGymEquipment = [
  "leg_press",
  "seated_leg_curl",
  "leg_extension",
  "glute_drive",
  "seated_calf",
  "machine_chest_press",
  "chest_supported_row",
  "lat_pulldown",
  "reverse_fly",
  "cable_lateral_raise",
  "tricep_pushdown",
  "cable_biceps",
  "pallof_press",
];
export function preparedCoachState(s: State): State {
  const c = getCoach(s);
  const coach = {
    ...c,
    programs: Object.fromEntries(
      (["lower", "upper", "full"] as Group[]).map((g) => [
        g,
        c.programs[g]?.length ? c.programs[g] : createProgram(s, g),
      ]),
    ),
  };
  const ready = { ...s, coach };
  const groups: Record<string, { group: Group; patterns?: string[] }> = {
    legs: { group: "lower" },
    push: {
      group: "upper",
      patterns: [
        "horizontal-push",
        "vertical-push",
        "chest-fly",
        "elbow-extension",
        "lateral-raise",
      ],
    },
    pull: {
      group: "upper",
      patterns: [
        "horizontal-pull",
        "vertical-pull",
        "rear-delt",
        "elbow-flexion",
      ],
    },
    upper: { group: "upper" },
  };
  // Only fill empty starter templates. Every user-authored template and all records remain intact.
  const templates: Template[] = s.templates.map((t) => {
    const spec = groups[t.name.trim().toLowerCase()];
    if (t.exercises.length || !spec) return t;
    const slots = (coach.programs[spec.group] ?? []).filter(
      (slot) =>
        allowed(coach, slot.catalogId) &&
        (!spec.patterns ||
          spec.patterns.includes(byId(slot.catalogId)!.pattern)),
    );
    return {
      ...t,
      exercises: slots.map((slot) => exerciseForSlot(ready, slot, spec.group)),
    };
  });
  return { ...ready, templates };
}
export function dayCheckIn(s: State, today = localDate()): CheckIn {
  const c = getCoach(s);
  if (c.checkIn?.date === today) return c.checkIn;
  const weekend = [0, 6].includes(new Date(today + "T12:00:00").getDay());
  return {
    date: today,
    minutes: weekend
      ? new Date(today + "T12:00:00").getDay() === 6
        ? (c.saturdayMinutes ?? c.weekendMinutes)
        : (c.sundayMinutes ?? c.weekendMinutes)
      : c.weekdayMinutes,
    energy: 3,
    sleep: "unknown",
    soreness: "unknown",
    pain: false,
    ill: false,
    choice: "auto",
    note: "",
    confirmed: false,
  };
}
export interface LoadProposal {
  weights?: number[];
  reps: number[];
  reason: string;
  basis: string;
  status:
    | "intro"
    | "confirm"
    | "review"
    | "maintain"
    | "increase"
    | "reduce"
    | "avoid";
  key?: string;
  fingerprint?: string;
}
export function loadProposal(
  s: State,
  slot: ProgramSlot,
  light = false,
  today = localDate(),
): LoadProposal {
  const c = getCoach(s),
    p = preference(c, slot.catalogId),
    rows = comparableHistory(s, slot.catalogId).filter(
      (r) => r.w.date <= today,
    );
  const any = historicalEntries(s, slot.catalogId).filter(
    (r) => r.w.date <= today,
  )[0];
  const base = {
    reps: Array(slot.sets).fill(slot.minReps),
    basis: any
      ? `${dateLabel(any.w.date, true)} · ${any.e.sets
          .filter((a) => a.done)
          .map((a) => `${num(a.weight)} kg × ${a.reps}`)
          .join(" / ")} · naprava/izvedba še nista potrjeni`
      : "Ni opravljenega zapisa iste vaje.",
  };
  if (!rows.length)
    return {
      ...base,
      status: any ? "confirm" : "intro",
      reason: any
        ? "Najprej potrdi isto napravo, način zapisa, izvedbo in delovne serije. Zgodovinski kilogrami niso današnje priporočilo."
        : "Nova naprava: ročno določi udobno obremenitev. Najprej 1–2 uvodni seriji; nato ciljni razpon s približno 2–3 ponovitvami v rezervi.",
    };
  const last = rows[0];
  const link = c.historyLinks[last.key];
  const sets = last.e.sets.filter(
    (a) =>
      a.done &&
      (a.kind === "work" ||
        (a.kind === "unknown" && link?.workingSetsConfirmed)),
  );
  const basis = `${dateLabel(last.w.date, true)} · ${p.identity} · ${sets.map((a) => `${num(a.weight)} kg × ${a.reps}`).join(" / ")}`;
  const out = {
    ...base,
    basis,
    key: last.key,
    fingerprint: historyFingerprint(last.w, last.e),
  };
  if (!sets.length)
    return {
      ...out,
      status: "confirm",
      reason:
        "Ni potrjenih opravljenih delovnih serij. Ogrevanje ni delovna obremenitev.",
    };
  if (last.e.pain || p.comfort === "no")
    return {
      ...out,
      status: "avoid",
      reason:
        "Zadnji zapis vsebuje bolečino ali vaja ni udobna. Ne predlagamo delovne teže; preglej omejitve in izberi ustrezno prilagoditev.",
    };
  const prev = rows[1];
  if (prev) {
    const old = prev.e.sets
      .filter((a) => a.done && a.kind !== "warmup")
      .map((a) => a.weight);
    const recent = sets.reduce((a, b) => a + b.weight, 0) / sets.length;
    const before = old.reduce((a, b) => a + b, 0) / Math.max(1, old.length);
    if (
      before > 0 &&
      Math.abs(recent - before) / before > 0.2 &&
      c.reviewedChanges[last.key] !== out.fingerprint
    )
      return {
        ...out,
        status: "review",
        reason:
          "Večja sprememba zadnjih obremenitev (> 20 %, praktični prag aplikacije). Ali se je spremenila naprava, izvedba ali počutje? Predlog počaka na tvojo potrditev.",
      };
  }
  const gap =
    (new Date(today + "T12:00:00").getTime() -
      new Date(last.w.date + "T12:00:00").getTime()) /
    86400000;
  const weights = Array.from(
    { length: slot.sets },
    (_, i) => sets[Math.min(i, sets.length - 1)].weight,
  );
  const reps = Array.from({ length: slot.sets }, (_, i) =>
    Math.max(
      slot.minReps,
      Math.min(slot.maxReps, sets[Math.min(i, sets.length - 1)].reps),
    ),
  );
  const loadMode = byId(slot.catalogId)?.mode ?? "machine";
  if (
    weights.some((w) => w <= 0) &&
    loadMode !== "bodyweight" &&
    loadMode !== "assisted"
  )
    return {
      ...out,
      status: "intro",
      reason:
        "Zapis ne določa uporabne delovne obremenitve za napravo. Določi jo ročno z uvodnimi serijami.",
    };
  if (light || gap > 14)
    return {
      ...out,
      weights: weights.map((w) =>
        loadMode === "assisted"
          ? w + p.increment
          : Math.min(
              w,
              Math.max(
                p.increment,
                Math.floor((w * 0.9) / p.increment) * p.increment,
              ),
            ),
      ),
      reps: reps.map(() => slot.minReps),
      status: "reduce",
      reason: `${light ? "Današnji lažji trening." : `Premor ${Math.floor(gap)} dni.`} ${loadMode === "assisted" ? "Predlagan je en korak več pomoči." : "Praktični predlog: manj serij in približno 10 % manjša obremenitev, zaokrožena na potrjen korak."} Prilagodi po uvodnih serijah.`,
    };
  if (
    !last.e.note &&
    last.e.coach?.formGood === true &&
    !dayCheckIn(s, today).extended &&
    sets.length >= slot.sets &&
    sets.every(
      (a) =>
        a.reps >= slot.maxReps &&
        a.rir !== undefined &&
        a.rir >= 2 &&
        a.weight === sets[0].weight,
    )
  )
    return {
      ...out,
      weights: weights.map((w) =>
        loadMode === "assisted"
          ? Math.max(0, w - p.increment)
          : w + p.increment,
      ),
      reps: reps.map(() => slot.minReps),
      status: "increase",
      reason:
        "Zadnji primerljivi trening: vse ciljne delovne serije na zgornjem razponu, RIR ≥ 2. Predlagan je en potrjen korak.",
    };
  return {
    ...out,
    weights,
    reps,
    status: "maintain",
    reason: last.e.note
      ? "Zadnji trening vsebuje opombo; predlog ohranja obremenitve. Opombo preglej pred potrditvijo."
      : "Uporabljene so zadnje primerljive delovne serije, tudi različne teže med serijami. Brez zadostnega RIR in ponovitev obremenitve ne povečamo.",
  };
}
export interface DayPlan {
  extended: boolean;
  group: Group;
  mode: "strength" | "light" | "cardio" | "rest" | "draft";
  title: string;
  reasons: string[];
  slots: ProgramSlot[];
  estimatedMinutes: number;
  minutes: number;
  warnings: string[];
}
export function planDay(s: State, today = localDate()): DayPlan {
  const c = getCoach(s),
    check = dayCheckIn(s, today),
    volume = weeklyVolume(s, today);
  const reasons: string[] = [];
  const warnings: string[] = [];
  const past = s.workouts.filter(
    (w) =>
      w.date <= today &&
      w.exercises.some((e) =>
        e.sets.some((a) => a.done && a.kind !== "warmup"),
      ),
  );
  const lastFor = (group: Group) =>
    past
      .filter((w) =>
        w.exercises.some(
          (e) => byId(e.id)?.group === group && e.sets.some((a) => a.done),
        ),
      )
      .map((w) => w.date)
      .sort()
      .at(-1);
  const days = (group: Group) => {
    const last = lastFor(group);
    return last
      ? (new Date(today + "T12:00:00").getTime() -
          new Date(last + "T12:00:00").getTime()) /
          86400000
      : Infinity;
  };
  const lower = days("lower"),
    upper = days("upper");
  let group: Group = lower >= upper ? "lower" : "upper";
  if (
    c.available.length &&
    c.available
      .filter((id) => allowed(c, id))
      .every((id) => byId(id)?.group === "upper")
  )
    group = "upper";
  if (c.available.filter((id) => allowed(c, id)).length <= 3) group = "full";
  if (check.group && check.group !== "auto") group = check.group;
  let mode: DayPlan["mode"] = "strength";
  if (
    c.rejected?.date === today ||
    !c.confirmed ||
    !s.profile.confirmed ||
    Object.values(c.joints).includes("unknown") ||
    !check.confirmed
  )
    mode = "draft";
  else if (
    check.ill ||
    check.pain ||
    check.choice === "rest" ||
    (check.soreness === "high" && check.energy <= 2)
  )
    mode = "rest";
  else if (check.choice === "cardio" || check.minutes < 20 || check.energy <= 1)
    mode = "cardio";
  else if (
    check.choice === "light" ||
    check.energy <= 2 ||
    check.sleep === "poor" ||
    (check.sleepHours !== undefined && check.sleepHours < 6) ||
    check.sleep === "unknown" ||
    check.soreness === "unknown" ||
    check.soreness === "high" ||
    (check.stress ?? 0) >= 4 ||
    check.muscleSoreness?.[group] === "high" ||
    (group === "lower"
      ? lower
      : group === "upper"
        ? upper
        : Math.min(lower, upper)) < 2
  )
    mode = "light";
  if (check.sleep === "unknown" || check.soreness === "unknown")
    warnings.push(
      "Premalo podatkov o današnji regeneraciji. Podatki ure niso povezani; odstotka regeneracije ne izračunavamo.",
    );
  if (s.profile.experience === "Začetnik")
    reasons.push(
      "Potrjene začetniške izkušnje: osnovni program začne z dvema delovnima serijama na vajo.",
    );
  if (mode === "draft")
    reasons.push(
      "Uredljiv osnutek. Potrdi profil, naprave, omejitve in današnje počutje pred začetkom.",
    );
  if (mode === "rest")
    reasons.push(
      check.pain || check.ill
        ? "Prijavljena je bolečina ali bolezensko počutje. Predlog je počitek; aplikacija ne presoja diagnoze."
        : "Današnje počutje ali tvoja izbira daje prednost počitku.",
    );
  if (mode === "cardio")
    reasons.push(
      "Krajši čas, malo energije ali tvoja izbira: po počutju lahkotna kardio aktivnost, brez cilja porabe kalorij.",
    );
  if (mode === "light")
    reasons.push(
      "Lažji trening zaradi počutja, spanja ali kratkega odmika od zadnjih vadb. To je previdno pravilo aplikacije.",
    );
  reasons.push(
    group === "full"
      ? "Manj razpoložljivih vaj: krajši mešan predlog."
      : `${group === "lower" ? "Spodnji" : "Zgornji"} del: prednost skupini z daljšim odmikom od zadnjega zapisa (${Number.isFinite(group === "lower" ? lower : upper) ? `${Math.floor(group === "lower" ? lower : upper)} dni` : "brez zapisa"}).`,
  );
  if ([0, 6].includes(new Date(today + "T12:00:00").getDay()))
    reasons.push(
      "Vikend vpliva samo na razpoložljive minute. Regeneracijo ocenjuje današnji vnos.",
    );
  const extended =
    !!check.extended &&
    mode === "strength" &&
    check.energy >= 4 &&
    check.sleep === "good" &&
    (check.stress ?? 0) <= 3 &&
    check.soreness !== "high" &&
    check.muscleSoreness?.[group] !== "high" &&
    (group === "lower" ? lower : upper) >= 2;
  if (check.extended && !extended)
    warnings.push(
      "Daljša različica ni priporočena glede na današnje podatke; čas ne potrjuje regeneracije.",
    );
  if (extended)
    reasons.push(
      "Daljša različica: temeljitejše ogrevanje in daljši počitki. Število serij in delovne teže se zaradi tega ne povečajo.",
    );
  if (c.rejected?.date === today)
    reasons.push("Današnji predlog si zavrnil: " + c.rejected.reason);
  const planned: Record<string, number> = {};
  const base = c.programs[group] ?? createProgram(s, group);
  const reserve = check.choice === "mixed" ? mixedCardioMinutes(check) : 0;
  const perSet = extended ? 3.5 : 3;
  let remaining = Math.max(0, check.minutes - reserve - (extended ? 12 : 8));
  const slots: ProgramSlot[] = [];
  if (mode !== "rest" && mode !== "cardio")
    for (const slot of base) {
      let id = slot.catalogId;
      if (!allowed(c, id)) {
        id = alternatives(s, id)[0]?.id ?? "";
        if (id)
          warnings.push(
            `${byId(slot.catalogId)?.name}: je izključena ali ni potrjena za današnji izbor; predlagana začasna alternativa ${byId(id)?.name}.`,
          );
      }
      if (!id) continue;
      const cat = byId(id)!;
      const known = Math.max(
        ...cat.muscles.map(
          (m) =>
            (volume[m]?.known ?? 0) +
            (volume[m]?.unknown ?? 0) +
            (planned[m] ?? 0),
        ),
      );
      if (known >= c.weeklySets) {
        warnings.push(
          `${cat.name}: zabeleženi tedenski obseg (tudi serije neznane vrste kot previdna zgornja meja) dosega nastavljeni praktični cilj ${c.weeklySets} serij; danes izpuščena.`,
        );
        continue;
      }
      let count = Math.min(
        slot.sets,
        mode === "light" ? 2 : slot.sets,
        Math.max(1, c.weeklySets - known),
      );
      if (remaining < count * perSet + 2) {
        if (slots.length === 0 && remaining >= perSet + 2) count = 1;
        else continue;
      }
      slots.push({ ...slot, catalogId: id, sets: count });
      cat.muscles.forEach((m) => (planned[m] = (planned[m] ?? 0) + count));
      remaining -= count * perSet + 2;
    }
  if ((mode === "strength" || mode === "light") && !slots.length) {
    mode = "cardio";
    reasons.push(
      "Za potrjene naprave in razpoložljiv čas ni ustreznega nabora vaj. Možnost je lahkotno gibanje po počutju ali počitek.",
    );
  }
  const title =
    mode === "rest"
      ? "Danes daj prostor počitku"
      : mode === "cardio"
        ? "Lahkotni kardio"
        : `${group === "lower" ? "Spodnji del" : group === "upper" ? "Zgornji del" : "Celotno telo"}${mode === "light" ? " · lažje" : mode === "draft" ? " · osnutek" : ""}`;
  return {
    extended,
    group,
    mode,
    title,
    reasons,
    slots,
    minutes: check.minutes,
    estimatedMinutes:
      mode === "rest" || (mode === "draft" && !slots.length)
        ? 0
        : mode === "cardio"
          ? cardioDuration(s, check)
          : Math.min(
              check.minutes,
              (extended ? 12 : 8) +
                slots.reduce(
                  (n, a) => n + a.sets * (extended ? 3.5 : 3) + 2,
                  0,
                ) +
                (check.choice === "mixed" ? reserve : 0),
            ),
    warnings,
  };
}
export function exerciseForSlot(
  s: State,
  slot: ProgramSlot,
  group: Group,
  light = false,
): Exercise {
  const cat = byId(slot.catalogId)!;
  const c = getCoach(s),
    p = preference(c, cat.id),
    proposal = loadProposal(s, slot, light);
  if (dayCheckIn(s).extended && proposal.status === "increase") {
    proposal.weights = proposal.weights?.map((w) =>
      cat.mode === "assisted" ? w + p.increment : w - p.increment,
    );
    proposal.status = "maintain";
    proposal.reason =
      "Daljša različica ohranja delovno težo; dodatni čas je za ogrevanje in počitke.";
  }
  return {
    ...newExercise(cat.name),
    id: cat.id,
    mode: cat.mode ?? "machine",
    equipment: p.identity,
    confirmed: !!p.identity.trim() && !!p.rom.trim() && p.comfort === "yes",
    minReps: slot.minReps,
    maxReps: slot.maxReps,
    increment: p.increment,
    rest: 90,
    coach: {
      catalogId: cat.id,
      slotId: slot.id,
      group,
      rom: p.rom,
      seat: p.seat,
      convention: p.convention,
      stepConfirmed:
        !!p.identity.trim() &&
        !!p.rom.trim() &&
        !!p.convention &&
        p.comfort === "yes",
      reason: cat.reason,
      calibration: !proposal.weights && cat.mode !== "bodyweight",
    },
    sets: Array.from({ length: slot.sets }, (_, i) => ({
      ...emptySet(),
      weight: proposal.weights?.[i] ?? 0,
      reps: proposal.reps[i] ?? slot.minReps,
      loadPending: !proposal.weights && cat.mode !== "bodyweight",
    })),
  };
}
export function coachWorkout(s: State, plan: DayPlan): Workout {
  if (plan.mode === "draft" || plan.mode === "rest")
    throw Error("Najprej potrdi nastavitve in današnji predlog.");
  const w: Workout = {
    id: uid(),
    name: plan.title,
    splitId: `coach-${plan.group}`,
    date: localDate(),
    source: "manual",
    startedAt: Date.now(),
    durationMin: 0,
    reviewDuration: false,
    note: "",
    coach: {
      group: plan.group,
      mode: plan.mode,
      reason: plan.reasons.join(" "),
      checkIn: dayCheckIn(s),
      generatedAt: new Date().toISOString(),
    },
    exercises: plan.slots.map((slot) =>
      exerciseForSlot(s, slot, plan.group, plan.mode === "light"),
    ),
  };
  if (plan.mode === "cardio")
    return attachCardio(s, { ...w, exercises: [] }, plan.estimatedMinutes);
  if (dayCheckIn(s).choice === "mixed") {
    return attachCardio(s, w, mixedCardioMinutes(dayCheckIn(s)));
  }
  return w;
}
export function replacementWorkout(
  w: Workout,
  index: number,
  replacement: Exercise,
): Workout {
  const old = w.exercises[index];
  const completed = old.sets.filter((a) => a.done);
  const pending = old.sets.filter((a) => !a.done && a.kind !== "warmup").length;
  if (!pending) return w;
  const next = {
    ...replacement,
    sets: Array.from({ length: pending }, (_, i) => ({
      ...emptySet(),
      weight: replacement.sets[i]?.weight ?? 0,
      reps: replacement.sets[i]?.reps ?? old.minReps,
      loadPending:
        replacement.sets[i]?.loadPending ?? replacement.mode === "machine",
    })),
    coach: {
      ...(replacement.coach ?? {
        catalogId: replacement.id,
        slotId: uid(),
        group: "full" as Group,
        rom: "",
        seat: "",
        reason: "Ročna zamenjava",
        calibration: true,
      }),
      slotId: old.coach?.slotId ?? replacement.coach?.slotId ?? old.id,
    },
  };
  const rows = [...w.exercises];
  rows.splice(
    index,
    1,
    ...(completed.length
      ? [
          {
            ...old,
            sets: completed,
            coach: {
              ...(old.coach ?? {
                catalogId: old.id,
                slotId: next.coach!.slotId,
                group: "full" as Group,
                rom: "",
                seat: "",
                reason: "Opravljene serije pri prvotni napravi",
                calibration: false,
              }),
              retired: true,
            },
          },
          next,
        ]
      : [next]),
  );
  return { ...w, exercises: rows };
}
export function replaceDevice(
  s: State,
  index: number,
  id: string,
  permanent: boolean,
): State {
  if (!s.active || !byId(id)) return s;
  const old = s.active.exercises[index],
    group = s.active.coach?.group ?? old.coach?.group ?? "full";
  const slot: ProgramSlot = {
    id: old.coach?.slotId ?? uid(),
    catalogId: id,
    sets: old.sets.filter((a) => !a.done && a.kind !== "warmup").length,
    minReps: old.minReps,
    maxReps: old.maxReps,
  };
  if (!slot.sets) return s;
  const next = exerciseForSlot(
    s,
    slot,
    group,
    s.active.coach?.mode === "light",
  );
  let result: State = {
    ...s,
    active: replacementWorkout(s.active, index, next),
  };
  if (permanent) {
    const c = structuredClone(getCoach(s));
    if (s.active.coach) {
      if (c.programs[group] === undefined)
        c.programs[group] = createProgram(s, group);
      const exists = c.programs[group]!.some((a) => a.id === slot.id);
      c.programs[group] = exists
        ? c.programs[group]!.map((a) =>
            a.id === slot.id ? { ...a, catalogId: id } : a,
          )
        : [
            ...c.programs[group]!,
            {
              ...slot,
              sets: old.sets.filter((a) => a.kind !== "warmup").length,
            },
          ];
    }
    result = {
      ...result,
      coach: s.active.coach ? c : s.coach,
      templates: s.templates.map((t) =>
        t.id === s.active!.splitId
          ? {
              ...t,
              exercises: t.exercises.map((e) =>
                e.id === old.id
                  ? {
                      ...next,
                      sets: Array.from({ length: e.sets.length }, () => ({
                        ...emptySet(),
                        weight: 0,
                        loadPending: true,
                      })),
                    }
                  : e,
              ),
            }
          : t,
      ),
    };
  }
  return result;
}
export function reconcileExercise(
  w: Workout,
  index: number,
  e: Exercise,
): Workout {
  const exercises = w.exercises.map((x, i) =>
    i === index ? { ...e, sets: [...e.sets] } : { ...x, sets: [...x.sets] },
  );
  if (e.coach?.retired) {
    const undone = e.sets.filter((a) => !a.done);
    const target = exercises.find(
      (x) => x.coach?.slotId === e.coach?.slotId && !x.coach?.retired,
    );
    if (target) {
      const count = undone.filter((a) => a.kind !== "warmup").length;
      target.sets = [
        ...target.sets,
        ...Array.from({ length: count }, () => ({
          ...emptySet(),
          weight: 0,
          loadPending: true,
        })),
      ];
      exercises[index] = { ...e, sets: e.sets.filter((a) => a.done) };
    }
  }
  return { ...w, exercises: exercises.filter((x) => x.sets.length > 0) };
}
export const cardioTypes = [
  { id: "bike", name: "Sobno kolo", guide: "Udoben sedež in lahkoten upor." },
  {
    id: "recumbent",
    name: "Ležeče kolo",
    guide: "Prilagodi sedež in preveri udoben obseg kolena.",
  },
  {
    id: "treadmill",
    name: "Hoja na tekalni stezi",
    guide: "Naklon prilagodi udobju; hitrost naj omogoča pogovor.",
  },
  {
    id: "elliptical",
    name: "Eliptik",
    guide: "Izberi udoben korak in zmeren upor.",
  },
  {
    id: "stepper",
    name: "Stopnice / stepper",
    guide:
      "Le če je udoben za kolena in počutje; brez privzete intenzivne vadbe.",
  },
];
export function cardioDuration(s: State, check = dayCheckIn(s)) {
  if (check.cardioMinutes)
    return Math.max(5, Math.min(check.minutes, check.cardioMinutes));
  const previous = s.workouts
    .filter((w) => w.date <= check.date)
    .flatMap((w) =>
      w.exercises
        .filter((e) => e.cardio)
        .flatMap((e) => e.sets.filter((a) => a.done).map((a) => a.reps)),
    );
  return Math.min(check.minutes, previous.some((m) => m >= 30) ? 30 : 20);
}
export function attachCardio(s: State, w: Workout, minutes: number): Workout {
  const c = getCoach(s),
    check = dayCheckIn(s);
  minutes = Math.floor(minutes);
  const id = cardioChoice(s, check);
  if (!id || !c.cardioEquipment?.includes(id))
    throw Error(
      "Najprej označi razpoložljivo kardio napravo in jo izberi za danes.",
    );
  if (
    Object.values(c.joints).includes("issue") &&
    !check.cardioComfortConfirmed
  )
    throw Error(
      "Najprej potrdi, da je izbrana kardio aktivnost udobna glede na tvoje omejitve.",
    );
  const type = cardioTypes.find((t) => t.id === id)!;
  const interval =
    !!check.intervals &&
    !check.extended &&
    c.cardioExperience === "regular" &&
    (check.stress ?? 0) < 4 &&
    (check.sleepHours ?? 8) >= 6 &&
    !Object.values(check.muscleSoreness ?? {}).includes("high") &&
    check.energy >= 4 &&
    check.sleep === "good" &&
    !check.pain &&
    !check.ill &&
    check.soreness !== "high";
  const warmup = Math.min(5, Math.floor(minutes / 3)),
    cooldown = Math.min(5, Math.floor(minutes / 3));
  const e = {
    ...newExercise(type.name),
    cardio: true,
    note: `${warmup} min ogrevanja + ${minutes - warmup - cooldown} min osrednjega dela + ${cooldown} min umirjanja. Pogovorni test: lahko govoriš v stavkih. ${interval ? "Izbirno: 1 min nekoliko živahneje / 2 min lahkotno, brez maksimalnega napora." : ""}`,
    sets: [{ ...emptySet(), weight: 0, reps: minutes }],
  };
  return {
    ...w,
    cardioPlan: {
      type: id,
      minutes,
      warmup,
      cooldown,
      incline:
        id === "treadmill" ? Math.max(0, Math.min(15, check.incline ?? 0)) : 0,
      intervals: interval,
      intensity:
        "Obvladljiva intenzivnost · pogovor v stavkih; po potrebi zmanjšaj tempo.",
    },
    exercises: [...w.exercises, e],
  };
}
export function calibrationProposal(
  e: Exercise,
  weight: number,
  reps: number,
  rir: number,
  formGood: boolean,
  pain: boolean,
) {
  if (!formGood || pain)
    return {
      weight: undefined,
      reason:
        "Izvedba ali udobje nista potrjena. Najprej prilagodi napravo oziroma vajo; ne povečuj obremenitve.",
    };
  if (!e.coach?.stepConfirmed)
    return {
      weight: undefined,
      reason:
        "Potrdi najmanjši dejansko razpoložljivi korak te naprave, preden predlagamo prilagoditev.",
    };
  if (reps < e.minReps || rir < 2)
    return {
      weight: Math.max(0, weight - e.increment),
      reason:
        "Poskus je bil prezahteven za ciljni razpon z rezervo. Predlagan je en korak manj; potrdi udobje pri novi poskusni seriji.",
    };
  if (reps >= e.maxReps && rir >= 4)
    return {
      weight: weight + e.increment,
      reason:
        "Poskus je bil lahek in nad ciljem z dovolj rezerve. Predlagan je samo en najmanjši korak več.",
    };
  return {
    weight,
    reason:
      "Poskus je v uporabnem razponu z rezervo. Obremenitev ohrani in jo prilagodi po počutju.",
  };
}
/** Optional extension: old v1 states/backups without coach data remain valid. */
export function validateCoachData(value: unknown): void {
  const fail = () => {
    throw Error("Neveljavni podatki modula Moj trener v varnostni kopiji.");
  };
  const object = (v: any) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) fail();
    return v;
  };
  const str = (v: any) => {
    if (typeof v !== "string") fail();
  };
  const finite = (v: any, min = 0, max = Infinity) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
      fail();
  };
  const bool = (v: any) => {
    if (typeof v !== "boolean") fail();
  };
  const array = (v: any) => {
    if (!Array.isArray(v)) fail();
    return v as any[];
  };
  const c = object(value);
  if (c.version !== 1) fail();
  bool(c.confirmed);
  array(c.available).forEach((id) => {
    if (!byId(id)) fail();
  });
  const joints = object(c.joints);
  for (const key of ["knees", "back", "shoulders"])
    if (!["unknown", "none", "issue"].includes(joints[key])) fail();
  finite(c.weekdayMinutes, 15, 180);
  finite(c.weekendMinutes, 15, 180);
  finite(c.weeklySets, 4, 20);
  if (!Number.isInteger(c.weeklySets)) fail();
  for (const k of ["saturdayMinutes", "sundayMinutes"])
    if (c[k] !== undefined) finite(c[k], 15, 180);
  for (const p of Object.values(object(c.preferences)) as any[]) {
    object(p);
    for (const k of ["identity", "rom", "seat"]) str(p[k]);
    if (p.convention !== undefined) str(p.convention);
    if (!["unknown", "yes", "no"].includes(p.comfort)) fail();
    bool(p.favorite);
    bool(p.excluded);
    finite(p.increment, 0.1);
  }
  const programs = object(c.programs);
  for (const [g, slots] of Object.entries(programs)) {
    if (!["lower", "upper", "full"].includes(g)) fail();
    array(slots).forEach((a) => {
      object(a);
      str(a.id);
      if (!byId(a.catalogId)) fail();
      finite(a.sets, 1, 6);
      finite(a.minReps, 1, 40);
      finite(a.maxReps, a.minReps, 40);
      if (
        !Number.isInteger(a.sets) ||
        !Number.isInteger(a.minReps) ||
        !Number.isInteger(a.maxReps)
      )
        fail();
    });
  }
  for (const link of Object.values(object(c.historyLinks)) as any[]) {
    object(link);
    for (const k of ["catalogId", "device", "rom", "fingerprint"]) str(link[k]);
    bool(link.workingSetsConfirmed);
    if (link.convention !== undefined) str(link.convention);
  }
  Object.values(object(c.reviewedChanges)).forEach(str);
  if (c.cardioEquipment !== undefined)
    array(c.cardioEquipment).forEach((id) => {
      if (!cardioTypes.some((t) => t.id === id)) fail();
    });
  if (
    c.cardioExperience !== undefined &&
    !["new", "regular"].includes(c.cardioExperience)
  )
    fail();
  if (c.checkIn !== undefined) {
    const a = object(c.checkIn);
    str(a.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) fail();
    finite(a.minutes, 10, 180);
    finite(a.energy, 1, 5);
    if (
      !["unknown", "good", "poor"].includes(a.sleep) ||
      !["unknown", "low", "moderate", "high"].includes(a.soreness) ||
      !["auto", "strength", "mixed", "light", "cardio", "rest"].includes(
        a.choice,
      )
    )
      fail();
    bool(a.pain);
    bool(a.ill);
    bool(a.confirmed);
    str(a.note);
    if (a.sleepHours !== undefined) finite(a.sleepHours, 0, 24);
    if (a.stress !== undefined) finite(a.stress, 1, 5);
    if (a.cardioMinutes !== undefined) finite(a.cardioMinutes, 5, 180);
    if (a.incline !== undefined) finite(a.incline, 0, 15);
    for (const k of ["extended", "intervals", "cardioComfortConfirmed"])
      if (a[k] !== undefined) bool(a[k]);
    if (
      a.group !== undefined &&
      !["auto", "lower", "upper", "full"].includes(a.group)
    )
      fail();
    if (a.muscleSoreness !== undefined)
      for (const x of Object.values(object(a.muscleSoreness)))
        if (!["low", "moderate", "high"].includes(x as string)) fail();
  }
  if (c.rejected !== undefined) {
    object(c.rejected);
    str(c.rejected.date);
    str(c.rejected.reason);
  }
  if (c.observations !== undefined)
    array(c.observations).forEach((a) => {
      object(a);
      if (!["hrvSDNN", "restingHeartRate", "sleepHours"].includes(a.metric))
        fail();
      finite(a.value);
      for (const k of ["source", "measuredAt", "context", "quality"]) str(a[k]);
      if (!["manual", "healthkit", "apple-shortcuts"].includes(a.source))
        fail();
    });
}

export function mixedCardioMinutes(check: CheckIn) {
  return Math.min(15, Math.max(5, Math.floor(check.minutes * 0.2)));
}
export function cardioChoice(s: State, check = dayCheckIn(s)) {
  const c = getCoach(s);
  const recentLegs = s.workouts.some(
    (w) =>
      w.date <= check.date &&
      new Date(check.date + "T12:00:00").getTime() -
        new Date(w.date + "T12:00:00").getTime() <
        2 * 86400000 &&
      w.exercises.some(
        (e) => byId(e.id)?.group === "lower" && e.sets.some((a) => a.done),
      ),
  );
  const gentle =
    recentLegs || c.joints.knees === "issue"
      ? c.cardioEquipment?.find((id) => ["recumbent", "bike"].includes(id))
      : undefined;
  return check.cardioType ?? gentle ?? c.cardioEquipment?.[0];
}
