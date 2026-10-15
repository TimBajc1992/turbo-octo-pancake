import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { applyHealthTransfer, validateHealthBridge } from "./healthShortcuts";
import { initialState, newExercise } from "./model";
import { backup, loadState, restoreBackup, saveState } from "./db";
const now = "2026-10-15T12:00:00Z";
const token = "12345678-1234-1234-1234-123456789abc";
const packet = (patch = {}) =>
  JSON.stringify({
    format: "tezisce-health-shortcuts",
    version: 1,
    token,
    source: "Apple Watch",
    date: "2026-10-15",
    updatedAt: now,
    steps: 4321,
    ...patch,
  });
const state = () => ({
  ...initialState(),
  healthBridge: { enabled: true, token },
});
describe("Apple Health transfer from Shortcuts", () => {
  it("upserts only its source/day, preserves manual data, active workout and strength sequence", () => {
    const s = state();
    s.daily = [
      { id: "manual", date: "2026-10-15", steps: 5000, source: "manual" },
    ];
    s.active = {
      id: "active",
      date: "2026-10-15",
      name: "Trening",
      splitId: "upper",
      exercises: [newExercise("Test")],
      durationMin: 0,
      reviewDuration: false,
      note: "Ohrani",
    };
    s.nextTemplate = 2;
    const next = applyHealthTransfer(s, packet({ moveKcal: "100,5" }), now);
    const again = applyHealthTransfer(next, packet({ steps: 5000 }), now);
    expect(again.daily).toHaveLength(2);
    expect(again.daily[0]).toEqual(s.daily[0]);
    expect(again.daily[1]).toMatchObject({
      steps: 5000,
      moveKcal: 100.5,
      source: "apple-shortcuts",
      sourceId: "Apple Watch",
    });
    expect(again.active).toEqual(s.active);
    expect(again.nextTemplate).toBe(2);
    expect(again.workouts).toEqual(s.workouts);
    expect(again.measurements).toEqual(s.measurements);
    expect(s.daily).toHaveLength(1);
    expect(restoreBackup(backup(again))).toEqual(again);
  });
  it("keeps samples and contexts separate from native HealthKit and does not invent missing zeros", () => {
    const s = state();
    const next = applyHealthTransfer(
      s,
      packet({
        steps: undefined,
        hrvSDNN: 40,
        hrvMeasuredAt: "2026-10-15T08:00:00Z",
        restingHeartRate: 60,
        restMeasuredAt: "2026-10-15T07:00:00Z",
      }),
      now,
    );
    expect(next.daily).toHaveLength(0);
    expect(next.coach?.observations).toHaveLength(2);
    expect(next.coach?.observations?.[0]).toMatchObject({
      value: 40,
      metric: "hrvSDNN",
      source: "apple-shortcuts",
      context: "unknown",
      quality: "unknown",
    });
    expect(
      applyHealthTransfer(
        next,
        packet({
          steps: undefined,
          hrvSDNN: 42,
          hrvMeasuredAt: "2026-10-15T09:00:00Z",
        }),
        now,
      ).coach?.observations,
    ).toHaveLength(2);
    expect(restoreBackup(backup(next))).toEqual(next);
  });
  it("does not roll back a newer daily summary or a manually modified record", () => {
    const next = applyHealthTransfer(state(), packet(), now);
    expect(
      applyHealthTransfer(
        next,
        packet({ steps: 1, updatedAt: "2026-10-15T11:00:00Z" }),
        now,
      ).daily,
    ).toEqual(next.daily);
    next.daily[0].modifiedAt = now;
    expect(() => applyHealthTransfer(next, packet(), now)).toThrow(
      /ročno spremenjen/,
    );
  });
  it.each([
    { token: "wrong" },
    { version: 2 },
    { date: "2026-02-30" },
    { steps: -1 },
    { steps: "123 korakov" },
    { steps: 1.5 },
    { moveKcal: Infinity },
    { standHours: 25 },
    { steps: undefined },
    { workouts: [] },
    { hrvSDNN: 40 },
    { restingHeartRate: 0, restMeasuredAt: now },
    { updatedAt: "2027-01-01T00:00:00Z" },
    { steps: "" },
  ])("rejects invalid or unauthorized transfers atomically: %j", (patch) => {
    const s = state(),
      original = structuredClone(s);
    expect(() => applyHealthTransfer(s, packet(patch), now)).toThrow();
    expect(s).toEqual(original);
  });
  it("requires explicit local enablement and retains compatibility with old backups", () => {
    expect(() => applyHealthTransfer(initialState(), packet(), now)).toThrow(
      /omogoči/,
    );
    const s = state();
    s.healthBridge.enabled = false;
    expect(() => applyHealthTransfer(s, packet(), now)).toThrow(/omogoči/);
    expect(() => validateHealthBridge({ enabled: true, token: "" })).toThrow();
    const old = initialState();
    expect(restoreBackup(backup(old))).toEqual(old);
  });
});

describe("multiple Safari tabs", () => {
  beforeEach(async () => {
    await saveState(state());
  });
  it("atomically prevents a stale tab from overwriting imported health data or active edits", async () => {
    const first = await loadState(),
      second = await loadState();
    const imported = applyHealthTransfer(first, packet(), now);
    await saveState(imported, first);
    await expect(
      saveState({ ...second, nextTemplate: 2 }, second),
    ).rejects.toThrow(/drugem zavihku/);
    expect(await loadState()).toEqual(imported);
  });
});
