import { describe, expect, it } from "vitest";
import { catalog, byId } from "../exerciseCatalog";
import {
  exerciseAnatomy,
  muscleRegions,
  muscleRole,
  anatomyView,
} from "./profiles";
import { backAnatomy, frontAnatomy } from "./shapes";

describe("exercise anatomy", () => {
  it("covers the full library with distinct roles and renderable muscle regions without editing catalog entries", () => {
    const before = structuredClone(catalog);
    const regions = new Set(
      [...frontAnatomy, ...backAnatomy].map((s) => s.region),
    );
    regions.add("hip-abductors");
    for (const exercise of catalog) {
      const p = exerciseAnatomy(exercise);
      expect(p.primary.length, exercise.id).toBeGreaterThan(0);
      const all = [...p.primary, ...p.secondary, ...p.stabilizer];
      expect(new Set(all).size, exercise.id).toBe(all.length);
      for (const region of all) {
        expect(regions.has(region), exercise.id + ": " + region).toBe(true);
        expect(muscleRegions[region]).toBeDefined();
      }
    }
    expect(catalog).toEqual(before);
  });
  it("keeps primary chest work, assisting triceps and shoulder work separate for a press", () => {
    const p = exerciseAnatomy(byId("bench_press")!);
    expect(muscleRole(p, "chest")).toBe("primary");
    expect(muscleRole(p, "triceps")).toBe("secondary");
    expect(muscleRole(p, "quadriceps")).toBeUndefined();
    expect(anatomyView(p)).toBe("front");
  });
  it("shows posterior anatomy for hamstrings, glutes, calves and rear deltoids", () => {
    for (const id of [
      "romanian_deadlift",
      "barbell_hip_thrust",
      "standing_calf",
      "reverse_fly",
    ])
      expect(anatomyView(exerciseAnatomy(byId(id)!)), id).toBe("back");
    expect(
      muscleRole(exerciseAnatomy(byId("standing_calf")!), "left-soleus"),
    ).toBe("primary");
    expect(
      muscleRole(exerciseAnatomy(byId("standing_calf")!), "shin"),
    ).toBeUndefined();
  });
  it("distinguishes lateral hip abduction from inner-thigh adduction", () => {
    const p = exerciseAnatomy(byId("hip_abduction_machine")!);
    expect(muscleRole(p, "hip-abductors")).toBe("primary");
    expect(muscleRole(p, "adductor")).toBeUndefined();
  });
  it("does not invent an anatomy profile for an unknown exercise", () => {
    expect(
      exerciseAnatomy({ ...catalog[0], pattern: "unknown" }).primary,
    ).toEqual([]);
  });
});
