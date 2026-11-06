import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ensureMocFormaSafetyCopy,
  loadState,
  readMocFormaSafetyCopy,
  readDeviceValue,
  saveState,
  writeDeviceValue,
} from "./db";
import { initialState, newExercise } from "./model";
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("tezisce");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
});
describe("Moč & Forma upgrade on the existing Težišče origin", () => {
  it("leaves the full current record and device connection unchanged while archiving a complete copy", async () => {
    const source = initialState();
    source.profile.name = "Ohranjen profil";
    source.active = {
      id: "active-old",
      date: "2026-11-01",
      name: "Stari aktiven trening",
      splitId: "custom",
      exercises: [newExercise("Neznana lastna vaja")],
      durationMin: 0,
      reviewDuration: false,
      note: "Izvirna opomba",
      raw: { untouched: true },
    };
    source.measurements = [
      { id: "m1", date: "2026-10-31", kind: "weight", value: 91.7 },
    ];
    source.daily = [
      { id: "d1", date: "2026-11-01", steps: 0, sleepHours: 7.5 },
    ];
    source.cardio = [
      {
        id: "c1",
        date: "2026-11-01",
        minutes: 22,
        extra: { unknown: "preserve" },
      },
    ];
    await saveState(source);
    await writeDeviceValue("sync", { opaque: "do not modify" });
    await ensureMocFormaSafetyCopy(await loadState());
    expect(await loadState()).toEqual(source);
    expect((await readMocFormaSafetyCopy())?.state).toEqual(source);
    expect(await readDeviceValue("sync")).toEqual({ opaque: "do not modify" });
  });
  it("never replaces the original safety copy on a subsequent visit or retry", async () => {
    const original = initialState();
    await saveState(original);
    await ensureMocFormaSafetyCopy(original);
    const changed = {
      ...original,
      profile: { ...original.profile, name: "Pozneje urejeno" },
    };
    await saveState(changed, original);
    await ensureMocFormaSafetyCopy(changed);
    expect((await readMocFormaSafetyCopy())?.state).toEqual(original);
    expect(await loadState()).toEqual(changed);
  });
});
