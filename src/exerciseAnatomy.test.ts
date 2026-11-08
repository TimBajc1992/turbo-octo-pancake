import { describe, expect, it } from "vitest";
import { byId, catalog } from "./exerciseCatalog";
import { anatomyForExercise, muscleRegions } from "./exerciseAnatomy";

describe("exercise anatomy without changing training or historical identities", () => {
  it("covers the established catalogue and keeps uncertain equipment explicit", () => {
    const before = JSON.stringify(catalog);
    for (const c of catalog) {
      const { primary, secondary, note } = anatomyForExercise(c);
      if (c.id === "trunk_machine") {
        expect(primary).toEqual([]);
        expect(note).toContain("najprej določi gib");
      } else expect(primary.length, c.id).toBeGreaterThan(0);
      const all = [...primary, ...secondary];
      expect(new Set(all).size, c.id).toBe(all.length);
      for (const region of all) expect(muscleRegions[region]).toBeDefined();
    }
    expect(JSON.stringify(catalog)).toBe(before);
  });
  it("distinguishes prime movers from assisting muscles in pressing and isolated knee extension", () => {
    const bench = anatomyForExercise(byId("bench_press")!);
    expect(bench.primary).toEqual(["chest"]);
    expect(bench.secondary).toEqual(["frontDelts", "triceps"]);
    expect(anatomyForExercise(byId("leg_extension")!)).toEqual({
      primary: ["quads"],
      secondary: [],
    });
    expect(anatomyForExercise(byId("reverse_fly")!).primary).toEqual([
      "rearDelts",
    ]);
  });
  it("does not present a seated calf raise as equal to a standing variation or a knee raise as only an abdominal curl", () => {
    expect(anatomyForExercise(byId("seated_calf")!).note).toContain("soleus");
    expect(anatomyForExercise(byId("hanging_knee_raise")!).primary).toEqual([
      "hipFlexors",
    ]);
    expect(anatomyForExercise(byId("hanging_knee_raise")!).secondary).toContain(
      "abs",
    );
  });
});
