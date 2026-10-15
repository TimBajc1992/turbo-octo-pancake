import { type State } from "./model";
import { createSyncSecret, type EncryptedSnapshot } from "./syncCore";
export interface SyncConnection {
  url: string;
  id: string;
  auth: string;
  secret: string;
}
export interface SyncDevice extends SyncConnection {
  base: State;
  revision: number;
  lastSyncAt?: string;
}
export function validateSyncConnection(c: SyncConnection): SyncConnection {
  const u = new URL(c.url.trim());
  if (
    u.protocol !== "https:" ||
    !/^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(u.hostname) ||
    u.port ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    u.pathname !== "/"
  )
    throw Error(
      "Vnesi HTTPS naslov svojega strežnika Cloudflare Workers (https://tezisce-sync.….workers.dev).",
    );
  for (const value of [c.id, c.auth, c.secret])
    if (!/^[a-zA-Z0-9_-]{43}$/.test(value))
      throw Error("Neveljavna koda za povezavo naprav.");
  return { url: u.origin, id: c.id, auth: c.auth, secret: c.secret };
}
export function createSyncConnection(url: string): SyncConnection {
  return validateSyncConnection({
    url,
    id: createSyncSecret(),
    auth: createSyncSecret(),
    secret: createSyncSecret(),
  });
}
export function pairingCode(c: SyncConnection): string {
  const v = validateSyncConnection(c);
  return btoa(JSON.stringify({ format: "tezisce-pair-v1", ...v }));
}
export function parsePairingCode(code: string): SyncConnection {
  if (code.trim().length > 3000) throw Error("Neveljavna koda za povezavo.");
  try {
    const c = JSON.parse(atob(code.trim()));
    if (c.format !== "tezisce-pair-v1") throw Error();
    return validateSyncConnection(c);
  } catch {
    throw Error(
      "Koda za povezavo ni veljavna. Kopiraj celotno kodo iz prve naprave.",
    );
  }
}
async function request(
  c: SyncConnection,
  method: string,
  payload?: EncryptedSnapshot,
  expected?: number,
  setup?: string,
) {
  const response = await fetch(c.url + "/v1/vaults/" + c.id, {
    method,
    headers: {
      Authorization: "Bearer " + c.auth,
      ...(payload ? { "Content-Type": "application/json" } : {}),
      ...(expected ? { "If-Match": `"${expected}"` } : {}),
      ...(setup ? { "X-Setup-Key": setup } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    if (response.status === 409)
      throw Error(
        "Druga naprava je pravkar posodobila podatke. Poskusi sinhronizacijo znova.",
      );
    if (response.status === 401 || response.status === 403)
      throw Error(
        "Dostop do shrambe ni dovoljen. Preveri kodo za povezavo oziroma namestitveno kodo Cloudflare.",
      );
    if (response.status === 413)
      throw Error(
        "Kopija je prevelika za skupno shrambo. Lokalni podatki so ohranjeni.",
      );
    throw Error(
      `Shramba ni dosegljiva (HTTP ${response.status}). Lokalno delo ostane na voljo.`,
    );
  }
  return response.json();
}
export async function readRemote(
  c: SyncConnection,
): Promise<{ revision: number; payload: EncryptedSnapshot }> {
  const r = await request(c, "GET");
  if (!Number.isSafeInteger(r?.revision) || r.revision < 1)
    throw Error("Neveljaven odgovor shrambe.");
  return r;
}
export async function writeRemote(
  c: SyncConnection,
  expected: number,
  payload: EncryptedSnapshot,
): Promise<number> {
  const r = await request(c, "PUT", payload, expected);
  if (r?.revision !== expected + 1)
    throw Error("Neveljavna potrjena različica shrambe.");
  return r.revision;
}
export async function createRemote(
  c: SyncConnection,
  setup: string,
  payload: EncryptedSnapshot,
): Promise<void> {
  if (setup.trim().length < 32)
    throw Error(
      "Vnesi namestitveno kodo (najmanj 32 znakov), ki je shranjena kot skrivnost v Cloudflare.",
    );
  const r = await request(c, "POST", payload, undefined, setup.trim());
  if (r?.revision !== 1) throw Error("Shramba ni bila ustvarjena.");
}
