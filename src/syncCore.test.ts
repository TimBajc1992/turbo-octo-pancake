import { describe, expect, it } from "vitest";
import { initialState, newExercise } from "./model";
import {
  createSyncSecret,
  encryptSnapshot,
  decryptSnapshot,
  mergeSnapshots,
  syncSnapshot,
  SyncConflict,
} from "./syncCore";

describe("encrypted multi-device snapshots", () => {
  it("encrypts before upload, uses a fresh nonce and round-trips without sharing per-device Health consent", async () => {
    const state = initialState();
    state.profile.name = "Zasebno ime";
    state.healthBridge = { enabled: true, token: crypto.randomUUID() };
    const key = createSyncSecret();
    expect(key).toHaveLength(43);
    const a = await encryptSnapshot(state, key),
      b = await encryptSnapshot(state, key);
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
    expect(JSON.stringify(a)).not.toContain("Zasebno ime");
    expect(await decryptSnapshot(a, key)).toEqual(syncSnapshot(state));
    expect(state.healthBridge.enabled).toBe(true);
    await expect(decryptSnapshot(a, createSyncSecret())).rejects.toThrow(
      /odkleniti/,
    );
    await expect(
      decryptSnapshot({ ...a, data: a.data.slice(0, -2) + "AA" }, key),
    ).rejects.toThrow();
  });
  it("merges independent records and profile fields, including deletion and same record in both devices", () => {
    const base = initialState();
    base.measurements = [
      { id: "old", date: "2026-10-14", kind: "weight", value: 100 },
    ];
    const local = structuredClone(base),
      remote = structuredClone(base);
    local.measurements = [];
    local.profile.name = "Ime";
    remote.daily = [{ id: "remote", date: "2026-10-15", steps: 1000 }];
    remote.profile.goal = "Moč";
    const merged = mergeSnapshots(base, local, remote);
    expect(merged.measurements).toEqual([]);
    expect(merged.daily).toEqual(remote.daily);
    expect(merged.profile).toMatchObject({ name: "Ime", goal: "Moč" });
    expect(mergeSnapshots(base, merged, merged)).toEqual(merged);
  });
  it("stops conflicting edits or delete-versus-edit without mutating any side", () => {
    const base = initialState();
    base.measurements = [
      { id: "same", date: "2026-10-15", kind: "weight", value: 100 },
    ];
    const l = structuredClone(base),
      r = structuredClone(base);
    l.measurements[0].value = 101;
    r.measurements[0].value = 102;
    expect(() => mergeSnapshots(base, l, r)).toThrow(SyncConflict);
    l.measurements = [];
    expect(() => mergeSnapshots(base, l, r)).toThrow(SyncConflict);
    expect(r.measurements[0].value).toBe(102);
    expect(base.measurements[0].value).toBe(100);
  });
  it("does not combine simultaneously edited active workouts", () => {
    const b = initialState();
    b.active = {
      id: "active",
      date: "2026-10-15",
      name: "Test",
      splitId: "upper",
      exercises: [newExercise("Vaja")],
      durationMin: 0,
      reviewDuration: false,
      note: "",
    };
    const l = structuredClone(b),
      r = structuredClone(b);
    l.active!.note = "Telefon";
    r.active!.note = "Računalnik";
    expect(() => mergeSnapshots(b, l, r)).toThrow(SyncConflict);
  });
});

import { createSyncConnection, pairingCode, parsePairingCode } from "./syncApi";
it("device pairing shares only connection keys, never a plaintext dataset or merge baseline", () => {
  const connection = createSyncConnection(
    "https://tezisce-sync.example.workers.dev",
  );
  const device = { ...connection, base: initialState(), revision: 123 };
  device.base.profile.name = "Zasebni podatki";
  const code = pairingCode(device),
    decoded = JSON.parse(atob(code));
  expect(Object.keys(decoded).sort()).toEqual([
    "auth",
    "format",
    "id",
    "secret",
    "url",
  ]);
  expect(atob(code)).not.toContain("Zasebni podatki");
  expect(parsePairingCode(code)).toEqual(connection);
  expect(() => parsePairingCode("invalid")).toThrow();
  expect(() => createSyncConnection("http://bad.test")).toThrow();
});
