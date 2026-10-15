import { useEffect, useRef, useState, type RefObject } from "react";
import { keepSyncSafetyCopy, readDeviceValue, writeDeviceValue } from "./db";
import { type State } from "./model";
import {
  createRemote,
  createSyncConnection,
  parsePairingCode,
  readRemote,
  validateSyncConnection,
  writeRemote,
  syncError,
  type SyncDevice,
} from "./syncApi";
import {
  decryptSnapshot,
  encryptSnapshot,
  mergeSnapshots,
  sameSnapshot,
  syncSnapshot,
  SyncConflict,
} from "./syncCore";

type Update = (fn: (state: State) => State) => Promise<void>;
export function useCloudSync(
  state: State | undefined,
  update: Update,
  storage: string,
  latest: RefObject<State | undefined>,
) {
  const [device, setDevice] = useState<SyncDevice>();
  const deviceRef = useRef<SyncDevice | undefined>(undefined);
  const [status, setStatus] = useState("Ni povezano");
  const [busy, setBusy] = useState(false),
    [paused, setPaused] = useState(false);
  const busyRef = useRef(false),
    generation = useRef(0);
  const [conflictRemote, setConflictRemote] = useState<State>();
  useEffect(() => {
    let active = true;
    readDeviceValue<SyncDevice>("sync")
      .then((d) => {
        if (!active || !d) return;
        validateSyncConnection(d);
        deviceRef.current = d;
        setDevice(d);
        setStatus("Povezano · preverjam podatke");
      })
      .catch(() =>
        setStatus(
          "Nastavitev sinhronizacije ni mogoče prebrati. Lokalni podatki ostanejo na voljo.",
        ),
      );
    return () => {
      active = false;
    };
  }, []);
  const persist = async (d: SyncDevice) => {
    await writeDeviceValue("sync", d);
    deviceRef.current = d;
    setDevice(d);
  };
  const apply = async (snapshot: State, base?: State) => {
    await update((s) => ({
      ...(base ? mergeSnapshots(base, syncSnapshot(s), snapshot) : snapshot),
      healthBridge: s.healthBridge,
    }));
  };
  async function run() {
    const d = deviceRef.current;
    if (!d || !latest.current || busyRef.current) return;
    if (storage !== "Shranjeno v tej napravi") {
      setStatus("Čakam na lokalno shranjevanje · " + storage);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setStatus("Preverjam in prenašam podatke …");
    const gen = generation.current;
    try {
      const remote = await readRemote(d),
        cloud = await decryptSnapshot(remote.payload, d.secret);
      if (gen !== generation.current) return;
      if (remote.revision < d.revision)
        throw Error(
          "Strežnik je vrnil starejšo različico. Samodejna sinhronizacija je ustavljena.",
        );
      const before = syncSnapshot(latest.current!);
      let merged: State;
      try {
        merged = mergeSnapshots(d.base, before, cloud);
      } catch (e) {
        if (e instanceof SyncConflict) {
          setPaused(true);
          setConflictRemote(cloud);
        }
        throw e;
      }
      let revision = remote.revision;
      if (!sameSnapshot(merged, cloud))
        revision = await writeRemote(
          d,
          remote.revision,
          await encryptSnapshot(merged, d.secret),
        );
      if (gen !== generation.current) return;
      // Keep edits made while the network request was in flight.
      const after = mergeSnapshots(
        before,
        syncSnapshot(latest.current!),
        merged,
      );
      if (!sameSnapshot(after, syncSnapshot(latest.current!))) {
        await keepSyncSafetyCopy(latest.current!);
        await apply(merged, before);
      }
      if (gen !== generation.current) return;
      const at = new Date().toISOString();
      await persist({ ...d, base: merged, revision, lastSyncAt: at });
      setStatus("Sinhronizirano · " + new Date(at).toLocaleString("sl-SI"));
      setConflictRemote(undefined);
    } catch (e) {
      setStatus(syncError(e));
      if (e instanceof SyncConflict) setPaused(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function syncNow() {
    if (navigator.locks)
      await navigator.locks.request(
        "tezisce-cloud-sync",
        { ifAvailable: true },
        async (lock) => {
          if (lock) await run();
          else
            setStatus(
              "Sinhronizacija poteka v drugem zavihku. Počakaj ali zapri drugi zavihek.",
            );
        },
      );
    else await run();
  }
  useEffect(() => {
    if (!device || paused || !state || storage !== "Shranjeno v tej napravi")
      return;
    const t = setTimeout(() => void syncNow(), 2500);
    return () => clearTimeout(t);
  }, [state, device?.id, paused, storage]);
  useEffect(() => {
    if (!device || paused) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void syncNow();
    }, 30000);
    const focus = () => {
      if (document.visibilityState === "visible") void syncNow();
    };
    document.addEventListener("visibilitychange", focus);
    window.addEventListener("online", focus);
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", focus);
      window.removeEventListener("online", focus);
      window.removeEventListener("focus", focus);
    };
  }, [device?.id, paused, storage]);
  async function connect(
    mode: "create" | "join",
    input: string,
    setup?: string,
  ) {
    if (
      !latest.current ||
      busyRef.current ||
      storage !== "Shranjeno v tej napravi"
    )
      throw Error("Najprej počakaj, da so lokalne spremembe shranjene.");
    busyRef.current = true;
    setBusy(true);
    setStatus(
      mode === "create"
        ? "Ustvarjam šifrirano shrambo …"
        : "Povezujem napravo in preverjam skupne podatke …",
    );
    const gen = ++generation.current;
    try {
      const c =
        mode === "create"
          ? createSyncConnection(input)
          : parsePairingCode(input);
      const initial = syncSnapshot(latest.current);
      let snapshot = initial,
        revision = 1;
      if (mode === "create")
        await createRemote(
          c,
          setup ?? "",
          await encryptSnapshot(snapshot, c.secret),
        );
      else {
        const r = await readRemote(c);
        snapshot = await decryptSnapshot(r.payload, c.secret);
        revision = r.revision;
      }
      if (gen !== generation.current) return;
      // Preserve the complete pre-connection local state, including shortcut configuration.
      await keepSyncSafetyCopy(latest.current!);
      if (mode === "join") {
        if (!sameSnapshot(initial, syncSnapshot(latest.current!)))
          throw Error(
            "Med povezovanjem so se lokalni podatki spremenili. Ponovi povezavo; nič ni bilo zamenjano.",
          );
        await update((current) => {
          if (!sameSnapshot(initial, syncSnapshot(current)))
            throw Error(
              "Med povezovanjem so se lokalni podatki spremenili. Ponovi povezavo.",
            );
          return { ...snapshot, healthBridge: current.healthBridge };
        });
      }
      const at = new Date().toISOString();
      await persist({ ...c, base: snapshot, revision, lastSyncAt: at });
      setPaused(false);
      setConflictRemote(undefined);
      setStatus("Sinhronizirano · " + new Date(at).toLocaleString("sl-SI"));
    } catch (error) {
      const message = syncError(error);
      setStatus(message);
      throw Error(message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function resolveConflict(choice: "local" | "remote") {
    const d = deviceRef.current;
    if (
      !d ||
      busyRef.current ||
      !latest.current ||
      storage !== "Shranjeno v tej napravi"
    )
      return;
    busyRef.current = true;
    setBusy(true);
    const gen = generation.current;
    try {
      const remote = await readRemote(d),
        cloud = await decryptSnapshot(remote.payload, d.secret);
      const local = syncSnapshot(latest.current!);
      await writeDeviceValue("sync-conflict-safety", {
        at: new Date().toISOString(),
        local: latest.current,
        remote: cloud,
      });
      let revision = remote.revision;
      const chosen = choice === "local" ? local : cloud;
      if (choice === "local")
        revision = await writeRemote(
          d,
          remote.revision,
          await encryptSnapshot(chosen, d.secret),
        );
      else
        await update((current) => {
          if (!sameSnapshot(local, syncSnapshot(current)))
            throw Error(
              "Lokalni podatki so se spremenili med izbiro. Poskusi znova.",
            );
          return { ...chosen, healthBridge: current.healthBridge };
        });
      if (gen !== generation.current) return;
      const at = new Date().toISOString();
      await persist({ ...d, base: chosen, revision, lastSyncAt: at });
      setPaused(false);
      setConflictRemote(undefined);
      setStatus(
        "Razlika je razrešena · " + new Date(at).toLocaleString("sl-SI"),
      );
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function disconnect() {
    ++generation.current;
    await writeDeviceValue("sync", undefined);
    deviceRef.current = undefined;
    setDevice(undefined);
    setPaused(false);
    setConflictRemote(undefined);
    setStatus("Odklopljeno · lokalni in oblačni podatki ostanejo ohranjeni");
  }
  return {
    device,
    status,
    busy,
    paused,
    conflictRemote,
    connect,
    disconnect,
    syncNow,
    resolveConflict,
    resume: () => {
      setPaused(false);
      void syncNow();
    },
  };
}
export type CloudSyncControl = ReturnType<typeof useCloudSync>;
