import { describe, expect, it } from "vitest";
import { bodyProgress } from "./BodyProgress";
import { bodyPoint } from "./body-shape";
import type { Measurement } from "./model";

describe("measurement-based body outline", () => {
  it("keeps the contour ordered even when weight and waist change in opposite directions", () => {
    for (const weight of [0.1, 0.56, 1, 1.8, 5])
      for (const waist of [0.3, 0.7, 1, 1.35, 3]) {
        let previous = -Infinity;
        for (let x = 0; x <= 360; x++) {
          const [next, y] = bodyPoint(x, 176, waist, weight);
          expect(next).toBeGreaterThan(previous);
          expect(y).toBe(176);
          previous = next;
        }
      }
  });
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
  it("uses weight changes to change symbolic body volume even without waist data", () => {
    expect(
      bodyProgress([
        { id: "w1", date: "2026-09-01", kind: "weight", value: 100 },
        { id: "w2", date: "2026-11-08", kind: "weight", value: 80 },
      ]),
    ).toMatchObject({
      ratio: 1,
      weightRatio: 0.8,
      hasWeightComparison: true,
      hasComparison: true,
      waist: undefined,
    });
    expect(bodyPoint(215, 140, undefined, 0.8)[0]).toBeLessThan(215);
    expect(bodyPoint(215, 140, undefined, 1.2)[0]).toBeGreaterThan(215);
    expect(bodyPoint(200, 40, undefined, 0.8)).toEqual([200, 40]);
  });
  it("combines independent weight and waist changes without counting the waist twice", () => {
    const p = bodyProgress([
      { id: "w1", date: "2026-09-01", kind: "weight", value: 100 },
      { id: "w2", date: "2026-11-08", kind: "weight", value: 110 },
      { id: "p1", date: "2026-09-01", kind: "waist", value: 100 },
      { id: "p2", date: "2026-11-08", kind: "waist", value: 90 },
    ]);
    expect(p).toMatchObject({
      ratio: 0.9,
      weightRatio: 1.1,
      hasWaistComparison: true,
      hasWeightComparison: true,
    });
    expect(bodyPoint(210, 176, p.ratio, p.weightRatio)[0]).toBeCloseTo(207, 1);
    expect(bodyPoint(215, 140, undefined, p.weightRatio)[0]).toBeGreaterThan(
      215,
    );
    expect(
      Number.isFinite(bodyPoint(210, 176, p.ratio, p.weightRatio)[0]),
    ).toBe(true);
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
