import { describe, expect, it } from "vitest";
import legacy from "./fixtures/legacy-exercises.json";
import {
  byId,
  candidateForExercise,
  catalog,
  normalizeExerciseName,
} from "./exerciseCatalog";
import { exerciseFamily } from "./exercise3d/motions";
import type { LoadMode } from "./model";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import provenance from "./assets/athlete-source.json";

describe("additive exercise catalogue", () => {
  it("retains all 55 previous identities, aliases and load conventions", () => {
    expect(legacy).toHaveLength(55);
    for (const original of legacy) {
      const current = byId(original.id)!;
      expect({
        id: current.id,
        name: current.name,
        mode: current.mode ?? "machine",
        aliases: current.aliases ?? [],
        equipment: current.equipment,
        pattern: current.pattern,
        muscles: current.muscles,
      }).toEqual(original);
      for (const name of [original.name, ...original.aliases])
        expect(
          candidateForExercise({
            id: "custom-historical-id",
            name,
            mode: original.mode as LoadMode,
          })?.id,
        ).toBe(original.id);
    }
  });
  it("has distinct IDs and unambiguous aliases in each load convention, and a defined visual for every specified movement", () => {
    const aliases = new Map<string, string>();
    expect(catalog.length).toBeGreaterThanOrEqual(132);
    expect(new Set(catalog.map((c) => c.id)).size).toBe(catalog.length);
    for (const c of catalog) {
      for (const name of [c.name, ...(c.aliases ?? [])]) {
        const key = `${c.mode ?? "machine"}:${normalizeExerciseName(name)}`;
        expect(aliases.get(key) ?? c.id, key).toBe(c.id);
        aliases.set(key, c.id);
      }
      expect(!!exerciseFamily(c), c.id).toBe(c.id !== "trunk_machine");
    }
  });
  it("ships an actual rendered poster for every specified movement and the recorded model hash", async () => {
    for (const c of catalog.filter((c) => exerciseFamily(c))) {
      const bytes = await readFile(
        new URL(`./assets/exercise-previews/${c.id}.webp`, import.meta.url),
      );
      expect(bytes.subarray(0, 4).toString(), c.id).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString(), c.id).toBe("WEBP");
      expect(bytes.length, c.id).toBeGreaterThan(1000);
    }
    const model = await readFile(
      new URL("./assets/athlete-optimized.glb", import.meta.url),
    );
    expect(createHash("sha256").update(model).digest("hex")).toBe(
      provenance.output.sha256,
    );
  });
});
