import { describe, expect, it } from "vitest";
import { bodyProgress } from "./BodyProgress";
import type { Measurement } from "./model";

describe("measurement-based body outline", () => {
  it("uses recorded waist measurements in date order without changing the source", () => {
    const rows: Measurement[] = [
      { id: "later", date: "2026-11-08", kind: "waist", value: 90 },
      { id: "first", date: "2026-09-01", kind: "waist", value: 100 },
      { id: "w", date: "2026-11-01", kind: "weight", value: 84.8 },
    ];
    const before = structuredClone(rows),
      result = bodyProgress(rows);
    expect(result.ratio).toBe(0.9);
    expect(result.waist?.id).toBe("later");
    expect(result.weight?.value).toBe(84.8);
    expect(result.hasComparison).toBe(true);
    expect(rows).toEqual(before);
  });
  it("does not infer a body shape from weight changes", () => {
    expect(
      bodyProgress([
        { id: "w1", date: "2026-09-01", kind: "weight", value: 100 },
        { id: "w2", date: "2026-11-08", kind: "weight", value: 80 },
      ]),
    ).toMatchObject({ ratio: 1, hasComparison: false, waist: undefined });
  });
  it("keeps a single waist measurement as the baseline and excludes invalid values", () => {
    const p = bodyProgress([
      { id: "bad", date: "2026-08-01", kind: "waist", value: 0 },
      { id: "one", date: "2026-09-01", kind: "waist", value: 92 },
      { id: "nan", date: "2026-11-08", kind: "waist", value: NaN },
    ]);
    expect(p).toMatchObject({
      ratio: 1,
      hasComparison: false,
      waist: { id: "one" },
    });
  });
});
