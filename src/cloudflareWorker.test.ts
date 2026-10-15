import worker from "../cloudflare/worker";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
// @ts-expect-error The Node deployment helper intentionally remains plain ESM.
import { checkCloudSync } from "../scripts/check-cloudflare-sync.mjs";
import { readFile } from "node:fs/promises";
import { transform } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { createSyncSecret } from "./syncCore";

describe("Cloudflare D1 encrypted vault API", () => {
  let mf: Miniflare;
  const origin = "https://timbajc1992.github.io",
    setup = "test-setup-key-not-production-1234567890";
  const id = createSyncSecret(),
    auth = createSyncSecret();
  const payload = {
    version: 1,
    iv: "AAAAAAAAAAAAAAAA",
    data: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  };
  const call = (
    method: string,
    body?: unknown,
    headers: Record<string, string> = {},
    vault = id,
  ) =>
    mf.dispatchFetch("https://sync.test/v1/vaults/" + vault, {
      method,
      headers: {
        Origin: origin,
        Authorization: "Bearer " + auth,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  beforeAll(async () => {
    const script = await transform(
      await readFile(
        new URL("../cloudflare/worker.ts", import.meta.url),
        "utf8",
      ),
      { loader: "ts", format: "esm" },
    );
    mf = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script: script.code,
        compatibilityDate: "2026-10-15",
        d1Databases: ["DB"],
        bindings: { SETUP_SECRET: setup, ALLOWED_ORIGIN: origin },
      }),
    );
    const db = await mf.getD1Database("DB");
    const schema = await readFile(
      new URL("../cloudflare/schema.sql", import.meta.url),
      "utf8",
    );
    for (const statement of schema
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(statement).run();
  }, 60000);
  afterAll(async () => {
    await mf?.dispose();
  });
  it("denies unauthorised enrollment and wrong origins", async () => {
    expect((await call("POST", payload)).status).toBe(401);
    expect(
      (
        await call("POST", payload, {
          "X-Setup-Key": setup,
          Origin: "https://other.test",
        })
      ).status,
    ).toBe(403);
    const preflight = await mf.dispatchFetch(
      "https://sync.test/v1/vaults/" + id,
      { method: "OPTIONS", headers: { Origin: origin } },
    );
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });
  it("enrolls once, stores only ciphertext and a hashed access token", async () => {
    const created = await call("POST", payload, { "X-Setup-Key": setup });
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ revision: 1 });
    expect((await call("POST", payload, { "X-Setup-Key": setup })).status).toBe(
      409,
    );
    const db = await mf.getD1Database("DB");
    const row = await db
      .prepare("SELECT * FROM tezisce_vaults WHERE id=?")
      .bind(id)
      .first<any>();
    expect(row.token_hash).not.toBe(auth);
    expect(row.token_hash).toHaveLength(64);
    expect(JSON.parse(row.payload)).toEqual(payload);
    expect(
      (
        await call("GET", undefined, {
          Authorization: "Bearer " + createSyncSecret(),
        })
      ).status,
    ).toBe(401);
    const got = await call("GET");
    expect(got.headers.get("Cache-Control")).toBe("no-store");
    expect(await got.json()).toEqual({ revision: 1, payload });
  });
  it("uses compare-and-swap revisions and retains previous encrypted versions", async () => {
    expect((await call("PUT", payload)).status).toBe(428);
    expect((await call("PUT", payload, { "If-Match": '"2"' })).status).toBe(
      409,
    );
    expect(
      (
        await call(
          "PUT",
          { ...payload, data: "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB" },
          { "If-Match": '"1"' },
        )
      ).status,
    ).toBe(200);
    const conflict = await call("PUT", payload, { "If-Match": '"1"' });
    expect(conflict.status).toBe(409);
    const got = (await (await call("GET")).json()) as any;
    expect(got.revision).toBe(2);
    expect(got.payload.data).toContain("BBBB");
    const db = await mf.getD1Database("DB");
    const old = await db
      .prepare(
        "SELECT payload FROM tezisce_history WHERE vault_id=? AND revision=1",
      )
      .bind(id)
      .first<any>();
    expect(JSON.parse(old.payload)).toEqual(payload);
  });
  it("rejects plaintext, unexpected fields and oversize data without changing the vault", async () => {
    expect(
      (await call("PUT", { steps: 1234 }, { "If-Match": '"2"' })).status,
    ).toBe(400);
    expect(
      (
        await call(
          "PUT",
          { ...payload, name: "private" },
          { "If-Match": '"2"' },
        )
      ).status,
    ).toBe(400);
    // Check the bounded streaming handler without local HTTP early-reject socket reset.
    const oversized = await worker.fetch(
      new Request("https://sync.test/v1/vaults/" + id, {
        method: "PUT",
        headers: {
          Origin: origin,
          Authorization: "Bearer " + auth,
          "Content-Type": "application/json",
          "If-Match": '"2"',
        },
        body: JSON.stringify({ ...payload, data: "A".repeat(1500001) }),
      }),
      {
        DB: (await mf.getD1Database("DB")) as any,
        SETUP_SECRET: setup,
        ALLOWED_ORIGIN: origin,
      },
    );
    expect(oversized.status).toBe(413);
    expect(((await (await call("GET")).json()) as any).revision).toBe(2);
  });
  it("checks real encrypted enrollment and two-device reads and cleans only its own synthetic vault", async () => {
    const db = await mf.getD1Database("DB");
    const before = await db
      .prepare("SELECT COUNT(*) AS count FROM tezisce_vaults")
      .first<any>();
    let cleaned = false;
    vi.stubGlobal("fetch", async (url: string, options: RequestInit) =>
      worker.fetch(new Request(url, options), {
        DB: db as any,
        SETUP_SECRET: setup,
        ALLOWED_ORIGIN: origin,
      }),
    );
    try {
      await checkCloudSync(
        "https://sync.test",
        setup,
        origin,
        async (vaultId: string, tokenHash: string) => {
          const row = await db
            .prepare("SELECT token_hash FROM tezisce_vaults WHERE id=?")
            .bind(vaultId)
            .first<any>();
          expect(row.token_hash).toBe(tokenHash);
          await db.batch([
            db
              .prepare(
                "DELETE FROM tezisce_history WHERE vault_id IN (SELECT id FROM tezisce_vaults WHERE id=? AND token_hash=?)",
              )
              .bind(vaultId, tokenHash),
            db
              .prepare("DELETE FROM tezisce_vaults WHERE id=? AND token_hash=?")
              .bind(vaultId, tokenHash),
          ]);
          cleaned = true;
        },
      );
    } finally {
      vi.unstubAllGlobals();
    }
    expect(cleaned).toBe(true);
    expect(
      await db.prepare("SELECT COUNT(*) AS count FROM tezisce_vaults").first(),
    ).toEqual(before);
    expect(((await (await call("GET")).json()) as any).revision).toBe(2);
  });
  it("accepts encoded Unicode setup keys while preserving literal keys used by older clients", async () => {
    const vaultId = createSyncSecret();
    const unicodeSetup = "Moja TEŽIŠČE koda z znaki % / žšč 123456789";
    const db = await mf.getD1Database("DB");
    const response = await worker.fetch(
      new Request("https://sync.test/v1/vaults/" + vaultId, {
        method: "POST",
        headers: {
          Origin: origin,
          Authorization: "Bearer " + auth,
          "Content-Type": "application/json",
          "X-Setup-Key": encodeURIComponent(unicodeSetup),
        },
        body: JSON.stringify(payload),
      }),
      { DB: db as any, SETUP_SECRET: unicodeSetup, ALLOWED_ORIGIN: origin },
    );
    expect(response.status).toBe(201);
    expect((await call("GET", undefined, {}, vaultId)).status).toBe(200);
    await db
      .prepare("DELETE FROM tezisce_vaults WHERE id=?")
      .bind(vaultId)
      .run();
  });
});
