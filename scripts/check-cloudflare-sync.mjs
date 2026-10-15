import { createHash, randomBytes, webcrypto } from "node:crypto";
import assert from "node:assert/strict";

/** A disposable synthetic vault: never enumerate, read, or modify personal vaults. */
export async function checkCloudSync(url, setup, origin, cleanup) {
  const id = randomBytes(32).toString("base64url");
  const auth = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(auth).digest("hex");
  const key = await webcrypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const encrypt = async (value) => {
    const iv = randomBytes(12);
    const data = await webcrypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: new TextEncoder().encode("tezisce-encrypted-sync:v1"),
      },
      key,
      new TextEncoder().encode(JSON.stringify(value)),
    );
    return {
      version: 1,
      iv: iv.toString("base64url"),
      data: Buffer.from(data).toString("base64url"),
    };
  };
  const decrypt = async (payload) =>
    JSON.parse(
      new TextDecoder().decode(
        await webcrypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: Buffer.from(payload.iv, "base64url"),
            additionalData: new TextEncoder().encode(
              "tezisce-encrypted-sync:v1",
            ),
          },
          key,
          Buffer.from(payload.data, "base64url"),
        ),
      ),
    );
  const request = (method, payload, extra = {}) =>
    fetch(`${url}/v1/vaults/${id}`, {
      method,
      headers: {
        Origin: origin,
        Authorization: `Bearer ${auth}`,
        ...(payload ? { "Content-Type": "application/json" } : {}),
        ...extra,
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(20000),
    });
  try {
    const initial = { synthetic: "TEZISCE connection check", revision: 1 };
    let response = await request("POST", await encrypt(initial), {
      "X-Setup-Key": encodeURIComponent(setup),
    });
    assert.equal(
      response.status,
      201,
      `Live enrollment failed (HTTP ${response.status}); check setup key and allowed origin.`,
    );
    assert.equal(
      response.headers.get("Access-Control-Allow-Origin"),
      origin,
      "Live CORS failed.",
    );
    assert.equal((await response.json()).revision, 1);
    response = await request("GET");
    assert.equal(response.status, 200, "Second-device read failed.");
    let remote = await response.json();
    assert.deepEqual(
      await decrypt(remote.payload),
      initial,
      "Second-device decryption failed.",
    );
    const updated = { ...initial, revision: 2 };
    response = await request("PUT", await encrypt(updated), {
      "If-Match": '"1"',
    });
    assert.equal(response.status, 200, "Second-device update failed.");
    assert.equal((await response.json()).revision, 2);
    response = await request("GET");
    assert.equal(response.status, 200);
    remote = await response.json();
    assert.equal(remote.revision, 2);
    assert.deepEqual(
      await decrypt(remote.payload),
      updated,
      "First-device readback failed.",
    );
    response = await request("PUT", await encrypt(initial), {
      "If-Match": '"1"',
    });
    assert.equal(response.status, 409, "Stale update was not rejected.");
    console.log(
      "Live encrypted sync verified: enrollment, two-device read/write, decryption and stale-write protection.",
    );
  } finally {
    // Restrict cleanup to BOTH our random ID and the hash of our freshly generated bearer.
    // Even an accidental ID collision cannot delete someone else's vault or history.
    await cleanup(id, tokenHash);
    console.log(
      "Disposable sync check removed; personal vaults were untouched.",
    );
  }
}
