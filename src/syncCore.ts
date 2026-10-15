import { backup, restoreBackup } from "./db";
import { canonical } from "./importer";
import { type State } from "./model";

export interface EncryptedSnapshot {
  version: 1;
  iv: string;
  data: string;
}
const encoder = new TextEncoder();
const aad = encoder.encode("tezisce-encrypted-sync:v1");
function toBase64(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192)
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[a-zA-Z0-9_-]+$/.test(value))
    throw Error("Neveljavna šifrirana vsebina ali ključ.");
  const text = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(text, (c) => c.charCodeAt(0));
}
export function createSyncSecret(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(32)));
}
async function aesKey(secret: string) {
  const raw = fromBase64(secret.trim());
  if (raw.byteLength !== 32)
    throw Error(
      "Povezovalni ključ mora vsebovati 43 znakov. Kopiraj ga iz prve naprave.",
    );
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
/** Per-browser Health shortcut consent and token are never copied to other devices. */
export function syncSnapshot(state: State): State {
  const next = structuredClone(state);
  delete next.healthBridge;
  return next;
}
export async function encryptSnapshot(
  state: State,
  secret: string,
): Promise<EncryptedSnapshot> {
  const plaintext = encoder.encode(backup(syncSnapshot(state)));
  if (plaintext.byteLength > 1024 * 1024)
    throw Error(
      "Kopija presega mejo 1 MB. Sinhronizacija je ustavljena, lokalni podatki ostanejo ohranjeni.",
    );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    await aesKey(secret),
    plaintext,
  );
  return { version: 1, iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}
export async function decryptSnapshot(
  payload: EncryptedSnapshot,
  secret: string,
): Promise<State> {
  if (
    !payload ||
    payload.version !== 1 ||
    typeof payload.iv !== "string" ||
    payload.iv.length !== 16 ||
    typeof payload.data !== "string" ||
    payload.data.length > 1500000
  )
    throw Error("Neveljavna šifrirana kopija.");
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(payload.iv), additionalData: aad },
      await aesKey(secret),
      fromBase64(payload.data),
    );
  } catch {
    throw Error(
      "Kopije ni mogoče odkleniti. Preveri povezovalni ključ; podatki niso bili zamenjani.",
    );
  }
  return syncSnapshot(restoreBackup(new TextDecoder().decode(plaintext)));
}
export function sameSnapshot(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

export class SyncConflict extends Error {
  constructor(public paths: string[]) {
    super(
      "Isti podatki so bili spremenjeni na več napravah. Samodejna sinhronizacija je ustavljena, nič ni prepisano: " +
        paths.join(", "),
    );
  }
}
/** Three-way merge: independent records/fields combine, edits/deletes of the same row stop. */
export function mergeSnapshots(
  base: State,
  local: State,
  remote: State,
): State {
  const conflicts: string[] = [];
  const merge = (b: any, l: any, r: any, path: string): any => {
    if (sameSnapshot(l, r)) return structuredClone(l);
    if (sameSnapshot(b, l)) return structuredClone(r);
    if (sameSnapshot(b, r)) return structuredClone(l);
    if (path === "active") {
      conflicts.push(path);
      return structuredClone(l);
    }
    if (Array.isArray(b) && Array.isArray(l) && Array.isArray(r)) {
      const identified = (a: any[]) =>
        a.every(
          (v) => v && typeof v === "object" && typeof v.id === "string",
        ) && new Set(a.map((v) => v.id)).size === a.length;
      if (identified(b) && identified(l) && identified(r)) {
        const bm = new Map(b.map((v) => [v.id, v])),
          lm = new Map(l.map((v) => [v.id, v])),
          rm = new Map(r.map((v) => [v.id, v]));
        const order = (a: any[]) =>
          a
            .filter((v) => bm.has(v.id) && lm.has(v.id) && rm.has(v.id))
            .map((v) => v.id);
        const bo = order(b),
          lo = order(l),
          ro = order(r);
        if (
          !sameSnapshot(lo, ro) &&
          !sameSnapshot(bo, lo) &&
          !sameSnapshot(bo, ro)
        )
          conflicts.push(path + ".vrstni red");
        const preferred = sameSnapshot(bo, lo) ? r : l;
        const ids = [
          ...new Set([...preferred, ...l, ...r, ...b].map((v) => v.id)),
        ];
        return ids
          .map((id) => {
            const bv = bm.get(id),
              lv = lm.get(id),
              rv = rm.get(id);
            // A row is the unit of conflict; never synthesize a performed workout from concurrent edits.
            if (sameSnapshot(lv, rv)) return structuredClone(lv);
            if (sameSnapshot(bv, lv)) return structuredClone(rv);
            if (sameSnapshot(bv, rv)) return structuredClone(lv);
            conflicts.push(path + "[" + id + "]");
            return structuredClone(lv);
          })
          .filter((v) => v !== undefined);
      }
    }
    const obj = (v: any) => v && typeof v === "object" && !Array.isArray(v);
    if (obj(b) && obj(l) && obj(r)) {
      const result: Record<string, unknown> = {};
      for (const key of new Set([
        ...Object.keys(b),
        ...Object.keys(l),
        ...Object.keys(r),
      ])) {
        const v = merge(b[key], l[key], r[key], path ? path + "." + key : key);
        if (v !== undefined) result[key] = v;
      }
      return result;
    }
    conflicts.push(path);
    return structuredClone(l);
  };
  const merged = merge(
    syncSnapshot(base),
    syncSnapshot(local),
    syncSnapshot(remote),
    "",
  );
  if (conflicts.length) throw new SyncConflict(conflicts);
  // Reuse backup validation before writing anything to the local database.
  return restoreBackup(backup(merged));
}
