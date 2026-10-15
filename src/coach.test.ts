import { describe, it, expect } from "vitest";
import {
  initialState,
  newExercise,
  records,
  plannedExercise,
  localDate,
  emptySet,
  type State,
  type Workout,
  type Exercise,
} from "./model";
import { backup, restoreBackup } from "./db";
import {
  alternatives,
  byId,
  calibrationProposal,
  cardioChoice,
  coachWorkout,
  comparableHistory,
  createProgram,
  dayCheckIn,
  defaultCoach,
  defaultPreference,
  exerciseForSlot,
  historyFingerprint,
  historyKey,
  loadProposal,
  planDay,
  preparedCoachState,
  suggestedGymEquipment,
  reconcileExercise,
  replaceDevice,
  weeklyVolume,
  type ProgramSlot,
} from "./coach";
const dayAgo = (n: number) => {
  const d = new Date(localDate() + "T12:00:00");
  d.setDate(d.getDate() - n);
  return localDate(d);
};
function ready(): State {
  const s = initialState();
  s.profile = {
    ...s.profile,
    confirmed: true,
    goal: "Moč",
    experience: "Redno treniram",
    equipment: "Fitnes",
    limitations: "Brez znanih omejitev",
  };
  s.coach = {
    ...defaultCoach(),
    confirmed: true,
    available: [
      "leg_press",
      "hack_squat",
      "leg_curl",
      "leg_extension",
      "machine_chest_press",
      "seated_row",
      "lat_pulldown",
    ],
    cardioEquipment: ["bike", "recumbent", "treadmill"],
    joints: { knees: "none", back: "none", shoulders: "none" },
    checkIn: {
      date: localDate(),
      minutes: 45,
      energy: 4,
      sleep: "good",
      soreness: "low",
      pain: false,
      ill: false,
      choice: "auto",
      confirmed: true,
      note: "",
      stress: 2,
    },
  };
  for (const id of s.coach.available)
    s.coach.preferences[id] = {
      ...defaultPreference(),
      identity: id + " A",
      rom: "udoben obseg",
      convention: "stack",
      comfort: "yes",
    };
  return s;
}
const slot = (id = "leg_press", count = 3): ProgramSlot => ({
  id: "lower-0",
  catalogId: id,
  sets: count,
  minReps: 8,
  maxReps: 12,
});
describe("ready trainer templates", () => {
  it("fills the empty starter templates while preserving custom work, history and an active workout", () => {
    const s = ready();
    s.coach!.available = [...suggestedGymEquipment];
    s.coach!.programs = { lower: [], upper: [] };
    const custom = newExercise("Moja obstoječa vaja");
    s.templates.find((t) => t.name === "Upper")!.exercises = [custom];
    const before = structuredClone(s);
    const result = preparedCoachState(s);
    expect(
      result.templates
        .filter((t) => t.name !== "Upper")
        .every((t) => t.exercises.length > 0),
    ).toBe(true);
    expect(result.templates.find((t) => t.name === "Upper")!.exercises).toEqual(
      [custom],
    );
    expect(result.coach!.programs.lower!.length).toBeGreaterThan(0);
    expect(result.workouts).toEqual(before.workouts);
    expect(result.measurements).toEqual(before.measurements);
    expect(result.templates.map((t) => t.id)).toEqual(
      before.templates.map((t) => t.id),
    );
    expect(s).toEqual(before);
    expect(preparedCoachState(result)).toEqual(result);
  });
  it("uses the selected daily minutes instead of capping every day at weekday minutes", () => {
    const s = ready();
    s.coach!.available = [...suggestedGymEquipment];
    s.coach!.weekdayMinutes = 45;
    s.coach!.checkIn!.minutes = 45;
    const short = planDay(s);
    s.coach!.checkIn!.minutes = 75;
    const long = planDay(s);
    expect(long.slots.length).toBeGreaterThan(short.slots.length);
    expect(long.estimatedMinutes).toBeGreaterThan(45);
    expect(long.estimatedMinutes).toBeLessThanOrEqual(75);
  });
});
function result(s: State, id: string, weights: number[], days = 1): Workout {
  const e = exerciseForSlot(s, slot(id, weights.length), "lower");
  e.coach!.formGood = true;
  e.sets = weights.map((weight) => ({
    ...emptySet(),
    weight,
    reps: 12,
    rir: 3,
    done: true,
  }));
  return {
    id: crypto.randomUUID(),
    date: dayAgo(days),
    name: "Sintetični trening",
    splitId: "legs",
    durationMin: 40,
    reviewDuration: false,
    note: "",
    exercises: [e],
  };
}
describe("Moj trener: evidence and loads", () => {
  it("uses latest comparable sets and preserves different weights per set", () => {
    const s = ready();
    s.workouts = [result(s, "seated_row", [45, 45, 40], 2)];
    s.workouts[0].exercises[0].sets[2].reps = 10;
    const p = loadProposal(s, slot("seated_row"));
    expect(p.weights).toEqual([45, 45, 40]);
    expect(p.basis).toContain("40 kg × 10");
  });
  it("asks about a sudden drop, then uses the lower recent result instead of an old record", () => {
    const s = ready();
    s.workouts = [result(s, "machine_shoulder_press", [55, 55, 55], 5)];
    s.coach!.preferences.machine_shoulder_press = {
      ...defaultPreference(),
      identity: "ramena A",
      rom: "udoben obseg",
      convention: "stack",
      comfort: "yes",
    };
    s.workouts = [
      result(s, "machine_shoulder_press", [55, 55, 55], 5),
      result(s, "machine_shoulder_press", [30, 30, 30], 1),
    ];
    s.workouts[1].exercises[0].sets[0].rir = undefined;
    const p = loadProposal(s, slot("machine_shoulder_press"));
    expect(p.status).toBe("review");
    expect(p.weights).toBeUndefined();
    s.coach!.reviewedChanges[p.key!] = p.fingerprint!;
    expect(loadProposal(s, slot("machine_shoulder_press")).weights).toEqual([
      30, 30, 30,
    ]);
  });
  it("does not move Bench Press numbers to a Machine Chest Press", () => {
    const s = ready();
    const w = result(s, "machine_chest_press", [85, 85, 80]);
    w.exercises[0].id = "bench_press";
    s.workouts = [w];
    expect(
      loadProposal(s, slot("machine_chest_press")).weights,
    ).toBeUndefined();
  });
  it("requires identity, load convention, ROM and explicit working set confirmation for legacy history", () => {
    const s = ready();
    const w = result(s, "leg_press", [120, 120, 120]);
    w.exercises[0].mode = "unknown";
    w.exercises[0].equipment = "";
    delete w.exercises[0].coach;
    w.exercises[0].sets = w.exercises[0].sets.map((a) => ({
      ...a,
      kind: "unknown",
    }));
    s.workouts = [w];
    expect(loadProposal(s, slot()).status).toBe("confirm");
    const key = historyKey(w, 0),
      pref = s.coach!.preferences.leg_press;
    s.coach!.historyLinks[key] = {
      catalogId: "leg_press",
      device: pref.identity,
      rom: pref.rom,
      convention: pref.convention,
      fingerprint: historyFingerprint(w, w.exercises[0]),
      workingSetsConfirmed: true,
    };
    expect(comparableHistory(s, "leg_press")).toHaveLength(1);
    s.workouts[0].exercises[0].sets[0].weight = 115;
    expect(comparableHistory(s, "leg_press")).toHaveLength(0);
  });
  it("increases only with all target sets, RIR and confirmed good technique", () => {
    const s = ready();
    s.workouts = [result(s, "leg_press", [100, 100, 100])];
    expect(loadProposal(s, slot()).status).toBe("increase");
    s.workouts[0].exercises[0].coach!.formGood = false;
    expect(loadProposal(s, slot()).status).toBe("maintain");
    s.workouts[0].exercises[0].coach!.formGood = true;
    s.workouts[0].exercises[0].sets[1].rir = undefined;
    expect(loadProposal(s, slot()).status).toBe("maintain");
  });
  it("new devices have no invented kg and unconfirmed sets remain incomplete", () => {
    const s = ready();
    const e = exerciseForSlot(s, slot("hack_squat"), "lower");
    expect(e.sets.every((a) => a.loadPending && !a.done)).toBe(true);
    expect(loadProposal(s, slot("hack_squat")).status).toBe("intro");
  });
  it("calibrates from an actual trial and exactly one user-defined increment", () => {
    const s = ready(),
      e = exerciseForSlot(s, slot(), "lower");
    expect(calibrationProposal(e, 20, 12, 5, true, false).weight).toBe(22.5);
    expect(calibrationProposal(e, 20, 6, 1, true, false).weight).toBe(17.5);
    expect(calibrationProposal(e, 20, 10, 3, true, false).weight).toBe(20);
    expect(
      calibrationProposal(e, 20, 12, 5, true, true).weight,
    ).toBeUndefined();
  });
  it("long gaps and poor readiness reduce instead of auto-progressing", () => {
    const s = ready();
    s.workouts = [result(s, "leg_press", [100, 100, 100], 20)];
    expect(loadProposal(s, slot()).weights).toEqual([90, 90, 90]);
    expect(loadProposal(s, slot(), true).status).toBe("reduce");
  });
});
describe("program stability and comparison identity", () => {
  it("starts beginners with fewer working sets and keeps explicit program choices stable", () => {
    const s = ready();
    s.profile.experience = "Začetnik";
    const program = createProgram(s, "lower");
    expect(program.every((a) => a.sets === 2)).toBe(true);
    s.coach!.programs.lower = program;
    s.workouts = [result(s, "hack_squat", [50, 50, 50], 5)];
    expect(s.coach!.programs.lower).toEqual(program);
    s.coach!.programs.lower = [];
    s.coach!.checkIn!.group = "lower";
    expect(planDay(s).slots).toHaveLength(0);
  });
  it("keeps records separate when load convention or ROM differ on the same device", () => {
    const s = ready();
    const a = result(s, "leg_press", [100], 3);
    const b = result(s, "leg_press", [50], 2);
    b.exercises[0].coach!.convention = "one-side";
    const c = result(s, "leg_press", [120], 1);
    c.exercises[0].coach!.rom = "drugačen obseg";
    s.workouts = [a, b, c];
    expect(records(s)).toHaveLength(3);
  });
  it("does not schedule intervals when stress is high despite otherwise good readings", () => {
    const s = ready();
    s.coach!.cardioExperience = "regular";
    Object.assign(s.coach!.checkIn!, {
      choice: "cardio",
      intervals: true,
      stress: 5,
    });
    expect(coachWorkout(s, planDay(s)).cardioPlan!.intervals).toBe(false);
  });
});
it("copied plans do not inherit performed sets, RIR, retired status or proof of good technique", () => {
  const s = ready();
  const e = result(s, "leg_press", [100, 100, 100]).exercises[0];
  e.coach!.retired = true;
  const next = plannedExercise(e);
  expect(next.sets.every((a) => !a.done && a.rir === undefined)).toBe(true);
  expect(next.coach).toMatchObject({ formGood: false, retired: false });
  expect(next.coach!.slotId).not.toBe(e.coach!.slotId);
  expect(e.coach!.formGood).toBe(true);
  expect(e.sets[0].done).toBe(true);
});
describe("substitution preserves the actual workout", () => {
  it("ranks matching available alternatives and never treats Leg Extension as full Leg Press replacement", () => {
    const s = ready();
    expect(alternatives(s, "leg_press").map((a) => a.id)).toEqual([
      "hack_squat",
    ]);
    s.coach!.preferences.hack_squat.excluded = true;
    expect(alternatives(s, "leg_press")).toHaveLength(0);
  });
  it("retains performed series and changes only remaining sets without copying loads", () => {
    const s = ready();
    s.active = result(s, "leg_press", [100, 100, 100], 0);
    s.active.exercises[0].sets[1].done = false;
    s.active.exercises[0].sets[2].done = false;
    const before = JSON.stringify(s);
    const next = replaceDevice(s, 0, "hack_squat", false);
    expect(JSON.stringify(s)).toBe(before);
    expect(next.active!.exercises).toHaveLength(2);
    expect(next.active!.exercises[0].sets[0].weight).toBe(100);
    expect(next.active!.exercises[0].sets.every((a) => a.done)).toBe(true);
    expect(next.active!.exercises[1].sets).toHaveLength(2);
    expect(
      next.active!.exercises[1].sets.every((a) => a.loadPending && !a.done),
    ).toBe(true);
    expect(next.active!.exercises.reduce((n, e) => n + e.sets.length, 0)).toBe(
      3,
    );
  });
  it("undoing a retained set moves its unfinished budget to the replacement", () => {
    const s = ready();
    s.active = result(s, "leg_press", [100, 100, 100], 0);
    s.active.exercises[0].sets[1].done = false;
    s.active.exercises[0].sets[2].done = false;
    const next = replaceDevice(s, 0, "hack_squat", false);
    const old = structuredClone(next.active!.exercises[0]);
    old.sets[0].done = false;
    const changed = reconcileExercise(next.active!, 0, old);
    expect(changed.exercises).toHaveLength(1);
    expect(changed.exercises[0].sets).toHaveLength(3);
    expect(next.active!.exercises[1].sets).toHaveLength(2);
  });
  it("temporary substitution leaves the program intact; permanent changes update its slot", () => {
    const s = ready();
    s.coach!.programs.lower = [slot()];
    s.active = result(s, "leg_press", [100, 100, 100], 0);
    s.active.coach = {
      group: "lower",
      mode: "strength",
      reason: "Test",
      checkIn: s.coach!.checkIn!,
      generatedAt: new Date().toISOString(),
    };
    s.active.exercises[0].sets[1].done = false;
    expect(
      replaceDevice(s, 0, "hack_squat", false).coach!.programs.lower![0]
        .catalogId,
    ).toBe("leg_press");
    expect(
      replaceDevice(s, 0, "hack_squat", true).coach!.programs.lower![0]
        .catalogId,
    ).toBe("hack_squat");
  });
});
describe("readiness, time, data preservation and cardio", () => {
  it("stays editable until setup and today are confirmed", () => {
    const s = ready();
    s.coach!.confirmed = false;
    expect(planDay(s).mode).toBe("draft");
    expect(() => coachWorkout(s, planDay(s))).toThrow();
  });
  it("good HRV never overrides pain, illness or poor sleep", () => {
    const s = ready();
    s.coach!.observations = [
      {
        metric: "hrvSDNN",
        value: 95,
        source: "healthkit",
        measuredAt: new Date().toISOString(),
        context: "breathing",
        quality: "valid",
      },
    ];
    s.coach!.checkIn!.pain = true;
    expect(planDay(s).mode).toBe("rest");
    s.coach!.checkIn!.pain = false;
    s.coach!.checkIn!.sleep = "poor";
    expect(planDay(s).mode).toBe("light");
  });
  it("ignores stale watch values and expired check-ins", () => {
    const s = ready();
    s.coach!.checkIn!.date = dayAgo(2);
    s.coach!.observations = [
      {
        metric: "hrvSDNN",
        value: 10,
        source: "manual",
        measuredAt: dayAgo(60) + "T08:00:00Z",
        context: "unknown",
        quality: "unknown",
      },
    ];
    expect(planDay(s).mode).toBe("draft");
    expect(dayCheckIn(s).confirmed).toBe(false);
  });
  it("a weekend after legs does not automatically prescribe heavier legs", () => {
    const s = ready();
    const saturday = "2026-10-17";
    s.workouts = [
      { ...result(s, "leg_press", [100, 100, 100]), date: "2026-10-16" },
    ];
    s.coach!.checkIn = {
      ...s.coach!.checkIn!,
      date: saturday,
      minutes: 75,
      extended: true,
    };
    const p = planDay(s, saturday);
    expect(p.group).toBe("upper");
    expect(p.reasons.join(" ")).toContain("Vikend vpliva samo");
    s.coach!.checkIn.energy = 1;
    expect(["rest", "cardio"]).toContain(planDay(s, saturday).mode);
  });
  it("cardio is a standalone workout with warmup/cooldown and no strength slots", () => {
    const s = ready();
    s.coach!.checkIn!.choice = "cardio";
    s.coach!.checkIn!.cardioMinutes = 30;
    const w = coachWorkout(s, planDay(s));
    expect(w.exercises.every((e) => e.cardio)).toBe(true);
    expect(w.exercises.every((e) => e.sets.every((a) => !a.done))).toBe(true);
    expect(w.cardioPlan).toMatchObject({
      minutes: 30,
      warmup: 5,
      cooldown: 5,
      intervals: false,
    });
    expect(s.nextTemplate).toBe(0);
  });
  it("does not default a new cardio user to 60 minutes or HIIT", () => {
    const s = ready();
    s.coach!.checkIn = {
      ...s.coach!.checkIn!,
      minutes: 90,
      choice: "cardio",
      intervals: true,
    };
    const w = coachWorkout(s, planDay(s));
    expect(w.cardioPlan!.minutes).toBe(20);
    expect(w.cardioPlan!.intervals).toBe(false);
  });
  it("mixed sessions reserve actual time for cardio", () => {
    const s = ready();
    s.coach!.checkIn!.choice = "mixed";
    const plan = planDay(s);
    const w = coachWorkout(s, plan);
    expect(w.cardioPlan!.minutes).toBe(9);
    expect(plan.estimatedMinutes).toBeLessThanOrEqual(45);
    expect(w.exercises.some((e) => !e.cardio)).toBe(true);
    expect(w.exercises.some((e) => e.cardio)).toBe(true);
  });
  it("selects a low-impact option after legs when available, with comfort required for limitations", () => {
    const s = ready();
    s.workouts = [result(s, "leg_press", [100, 100, 100])];
    expect(["bike", "recumbent"]).toContain(cardioChoice(s));
    s.coach!.checkIn!.choice = "cardio";
    s.coach!.joints.knees = "issue";
    expect(() => coachWorkout(s, planDay(s))).toThrow("udobna");
    s.coach!.checkIn!.cardioComfortConfirmed = true;
    expect(coachWorkout(s, planDay(s)).cardioPlan).toBeTruthy();
  });
  it("a manually rejected proposal stays rejected across backup restore", () => {
    const s = ready();
    s.coach!.rejected = { date: localDate(), reason: "Moj ročni trening" };
    const next = restoreBackup(backup(s));
    expect(planDay(next).mode).toBe("draft");
    expect(planDay(next).reasons.join(" ")).toContain("Moj ročni trening");
  });
  it("recomputes volume and the next group after a newly completed session without changing its records", () => {
    const s = ready();
    const before = planDay(s);
    s.workouts.push(result(s, "leg_press", [100, 100, 100], 0));
    expect(weeklyVolume(s)["Sprednje stegenske"].known).toBe(3);
    expect(planDay(s).group).not.toBe(before.group);
    expect(s.workouts[0].exercises[0].sets[0].weight).toBe(100);
  });
  it("old backups remain readable and coach active states round-trip without loss", () => {
    const old = initialState();
    expect(restoreBackup(backup(old))).toEqual(old);
    const s = ready();
    s.active = coachWorkout(s, planDay(s));
    expect(restoreBackup(backup(s))).toEqual(s);
    const invalid = JSON.parse(backup(s));
    invalid.state.coach.weeklySets = "bad";
    expect(() => restoreBackup(JSON.stringify(invalid))).toThrow("Moj trener");
  });
});
