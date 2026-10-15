interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}
interface Database {
  prepare(sql: string): Statement;
  batch(queries: Statement[]): Promise<{ meta: { changes: number } }[]>;
}
interface Env {
  DB: Database;
  SETUP_SECRET: string;
  ALLOWED_ORIGIN: string;
}
const maxBody = 1500000;
const keyPattern = /^[A-Za-z0-9_-]{43}$/;
async function digest(text: string): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
async function matches(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const allowed = env.ALLOWED_ORIGIN || "https://timbajc1992.github.io";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      Vary: "Origin",
    };
    if (origin === allowed)
      Object.assign(headers, {
        "Access-Control-Allow-Origin": allowed,
        "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
        "Access-Control-Allow-Headers":
          "Authorization,Content-Type,If-Match,X-Setup-Key",
        "Access-Control-Max-Age": "600",
      });
    const reply = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers });
    if (origin && origin !== allowed)
      return reply(403, { error: "Origin not allowed" });
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET")
      return reply(200, { service: "tezisce-encrypted-sync", version: 1 });
    const route = /^\/v1\/vaults\/([A-Za-z0-9_-]{43})$/.exec(url.pathname);
    if (!route || url.search) return reply(404, { error: "Not found" });
    if (!["GET", "POST", "PUT"].includes(request.method))
      return reply(405, { error: "Method not allowed" });
    const id = route[1];
    const auth = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
      request.headers.get("Authorization") ?? "",
    );
    if (!auth) return reply(401, { error: "Unauthorized" });
    const tokenHash = await digest(auth[1]);
    try {
      const existing = await env.DB.prepare(
        "SELECT token_hash,revision,payload FROM tezisce_vaults WHERE id=?",
      )
        .bind(id)
        .first<{ token_hash: string; revision: number; payload: string }>();
      if (request.method === "POST") {
        const suppliedSetup = request.headers.get("X-Setup-Key") ?? "";
        let setup = suppliedSetup;
        try {
          setup = decodeURIComponent(suppliedSetup);
        } catch {
          /* Older clients send the literal ASCII key. */
        }
        if (
          !env.SETUP_SECRET ||
          env.SETUP_SECRET.length < 32 ||
          (!(await matches(suppliedSetup, env.SETUP_SECRET)) &&
            !(await matches(setup, env.SETUP_SECRET)))
        )
          return reply(401, { error: "Enrollment not allowed" });
        if (existing) return reply(409, { error: "Vault already exists" });
      } else if (!existing || !(await matches(tokenHash, existing.token_hash)))
        return reply(401, { error: "Unauthorized" });
      if (request.method === "GET")
        return reply(200, {
          revision: existing!.revision,
          payload: JSON.parse(existing!.payload),
        });
      // Bound streaming input too; Content-Length alone is not a trustworthy limit.
      if (Number(request.headers.get("Content-Length") ?? 0) > maxBody)
        return reply(413, { error: "Snapshot too large" });
      if (!request.headers.get("Content-Type")?.startsWith("application/json"))
        return reply(415, { error: "JSON required" });
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: "Empty snapshot" });
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBody) {
          await reader.cancel();
          return reply(413, { error: "Snapshot too large" });
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const part of chunks) {
        bytes.set(part, offset);
        offset += part.length;
      }
      let payload: any;
      try {
        payload = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        return reply(400, { error: "Invalid JSON" });
      }
      if (
        !payload ||
        payload.version !== 1 ||
        typeof payload.iv !== "string" ||
        !/^[A-Za-z0-9_-]{16}$/.test(payload.iv) ||
        typeof payload.data !== "string" ||
        !/^[A-Za-z0-9_-]{22,}$/.test(payload.data) ||
        Object.keys(payload).some((k) => !["version", "iv", "data"].includes(k))
      )
        return reply(400, { error: "Encrypted snapshot required" });
      const text = JSON.stringify(payload);
      const at = new Date().toISOString();
      if (request.method === "POST") {
        const result = await env.DB.batch([
          env.DB.prepare(
            "INSERT OR IGNORE INTO tezisce_vaults(id,token_hash,revision,payload,updated_at) VALUES(?,?,1,?,?)",
          ).bind(id, tokenHash, text, at),
        ]);
        if (result[0].meta.changes !== 1)
          return reply(409, { error: "Vault already exists" });
        return reply(201, { revision: 1 });
      }
      const match = /^"([1-9][0-9]*)"$/.exec(
        request.headers.get("If-Match") ?? "",
      );
      const expected = match ? Number(match[1]) : NaN;
      if (!Number.isSafeInteger(expected))
        return reply(428, { error: "Revision required" });
      const result = await env.DB.batch([
        env.DB.prepare(
          "INSERT OR IGNORE INTO tezisce_history(vault_id,revision,payload,updated_at) SELECT id,revision,payload,updated_at FROM tezisce_vaults WHERE id=? AND token_hash=? AND revision=?",
        ).bind(id, tokenHash, expected),
        env.DB.prepare(
          "UPDATE tezisce_vaults SET revision=revision+1,payload=?,updated_at=? WHERE id=? AND token_hash=? AND revision=?",
        ).bind(text, at, id, tokenHash, expected),
        env.DB.prepare(
          "DELETE FROM tezisce_history WHERE vault_id=? AND revision < (SELECT revision-10 FROM tezisce_vaults WHERE id=?)",
        ).bind(id, id),
      ]);
      if (result[1].meta.changes !== 1)
        return reply(409, { error: "Revision conflict" });
      return reply(200, { revision: expected + 1 });
    } catch {
      // Do not log requests, bearer tokens, payloads or database exception messages.
      return reply(503, { error: "Storage temporarily unavailable" });
    }
  },
};
