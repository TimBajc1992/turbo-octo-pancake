import { cloudflareToken } from "./cloudflare-token.mjs";
import { checkCloudSync } from "./check-cloudflare-sync.mjs";
import { spawn } from "node:child_process";
import { readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
for (const name of [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "TEZISCE_SYNC_SETUP_KEY",
]) {
  if (!process.env[name])
    throw Error(
      `Missing configured secret: ${name}. No deployment was attempted.`,
    );
}
const deployEnv = {
  ...process.env,
  CLOUDFLARE_API_TOKEN: cloudflareToken(process.env.CLOUDFLARE_API_TOKEN),
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID.trim(),
};
const setupKey = process.env.TEZISCE_SYNC_SETUP_KEY.trim();
if (!/^[a-f0-9]{32}$/i.test(deployEnv.CLOUDFLARE_ACCOUNT_ID))
  throw Error("Invalid configured Cloudflare account ID.");
if (setupKey.length < 32 || /[\r\n]/.test(setupKey))
  throw Error("The setup key must have at least 32 characters.");
const cli = path.join(root, "node_modules/wrangler/bin/wrangler.js");
const configPath = path.join(root, "cloudflare/wrangler.generated.json");
async function wrangler(args, { capture = false, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: root,
      env: deployEnv,
      stdio: ["pipe", capture ? "pipe" : "inherit", "inherit"],
    });
    let output = "";
    if (capture) child.stdout.on("data", (b) => (output += b));
    child.on("error", () => reject(Error("Could not start Wrangler.")));
    child.on("close", (code) =>
      code === 0
        ? resolve(output)
        : reject(
            Error(
              `Wrangler failed (${args[0]} ${args[1] ?? ""}). Check the restricted GitHub Actions log.`,
            ),
          ),
    );
    child.stdin.end(input ?? "");
  });
}
let databases = JSON.parse(
  await wrangler(["d1", "list", "--json"], { capture: true }),
);
if (!Array.isArray(databases)) throw Error("Unexpected D1 list response.");
let db = databases.find((d) => d.name === "tezisce-sync");
if (!db) {
  await wrangler([
    "d1",
    "create",
    "tezisce-sync",
    "--jurisdiction",
    "eu",
    "--update-config=false",
  ]);
  databases = JSON.parse(
    await wrangler(["d1", "list", "--json"], { capture: true }),
  );
  db = databases.find((d) => d.name === "tezisce-sync");
}
const id = db?.uuid ?? db?.id;
if (typeof id !== "string" || !id)
  throw Error("D1 provisioning did not return its database ID.");
const config = JSON.parse(
  await readFile(path.join(root, "cloudflare/wrangler.json"), "utf8"),
);
config.d1_databases[0].database_id = id;
await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
await wrangler([
  "d1",
  "execute",
  "tezisce-sync",
  "--remote",
  "--file",
  path.join(root, "cloudflare/schema.sql"),
  "--config",
  configPath,
]);
await wrangler(["secret", "put", "SETUP_SECRET", "--config", configPath], {
  input: setupKey,
});
const output = await wrangler(["deploy", "--config", configPath], {
  capture: true,
});
const url = output.match(
  /https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\b/,
)?.[0];
if (!url)
  throw Error(
    "Deployment returned no workers.dev URL. Check the Cloudflare dashboard before retrying.",
  );
console.log(`Checking deployed sync endpoint: ${url}`);
// The public route can briefly serve the placeholder created by `secret put`.
// Wait for the deployed version rather than treating its first response as final.
let healthy = false;
for (let attempt = 0; attempt < 8; attempt++) {
  try {
    const health = await fetch(url + "/health", {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    const body = await health.json().catch(() => null);
    healthy =
      health.ok &&
      body?.service === "tezisce-encrypted-sync" &&
      body?.version === 1;
    if (healthy) break;
    console.log(
      `Health check ${attempt + 1}/8: HTTP ${health.status}; expected service not yet available.`,
    );
  } catch {
    console.log(`Health check ${attempt + 1}/8: endpoint not yet reachable.`);
  }
  if (attempt < 7) await new Promise((resolve) => setTimeout(resolve, 3000));
}
if (!healthy)
  throw Error(
    "The deployed health endpoint did not pass verification after retries.",
  );
// Exercise the real D1 read path and browser CORS without creating a personal vault.
const denied = await fetch(`${url}/v1/vaults/${"A".repeat(43)}`, {
  headers: { Authorization: `Bearer ${"B".repeat(43)}` },
  signal: AbortSignal.timeout(10000),
});
if (denied.status !== 401)
  throw Error(
    `The deployed D1 authorization check returned HTTP ${denied.status}, expected 401.`,
  );
const preflight = await fetch(url + "/v1/vaults/" + "A".repeat(43), {
  method: "OPTIONS",
  headers: {
    Origin: config.vars.ALLOWED_ORIGIN,
    "Access-Control-Request-Method": "PUT",
  },
  signal: AbortSignal.timeout(10000),
});
if (
  preflight.status !== 204 ||
  preflight.headers.get("Access-Control-Allow-Origin") !==
    config.vars.ALLOWED_ORIGIN
)
  throw Error("The deployed browser CORS check failed.");
await checkCloudSync(
  url,
  setupKey,
  config.vars.ALLOWED_ORIGIN,
  async (vaultId, tokenHash) => {
    if (
      !/^[A-Za-z0-9_-]{43}$/.test(vaultId) ||
      !/^[a-f0-9]{64}$/.test(tokenHash)
    )
      throw Error("Invalid disposable check identity.");
    const command = `DELETE FROM tezisce_history WHERE vault_id IN (SELECT id FROM tezisce_vaults WHERE id='${vaultId}' AND token_hash='${tokenHash}'); DELETE FROM tezisce_vaults WHERE id='${vaultId}' AND token_hash='${tokenHash}';`;
    await wrangler(
      [
        "d1",
        "execute",
        "tezisce-sync",
        "--remote",
        "--command",
        command,
        "--config",
        configPath,
      ],
      { capture: true },
    );
  },
);
console.log(`Verified sync endpoint: ${url}`);
if (process.env.GITHUB_OUTPUT)
  await appendFile(process.env.GITHUB_OUTPUT, `url=${url}\n`);
if (process.env.GITHUB_STEP_SUMMARY)
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `## TEŽIŠČE: Cloudflare\n\nVerified endpoint: ${url}\n\nThe database contains ciphertext only. No personal vault was created by deployment.\n`,
  );
