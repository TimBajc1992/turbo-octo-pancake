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
if (!/^[a-f0-9]{32}$/i.test(process.env.CLOUDFLARE_ACCOUNT_ID))
  throw Error("Invalid configured Cloudflare account ID.");
if (process.env.TEZISCE_SYNC_SETUP_KEY.length < 32)
  throw Error("The setup key must have at least 32 characters.");
const cli = path.join(root, "node_modules/wrangler/bin/wrangler.js");
const configPath = path.join(root, "cloudflare/wrangler.generated.json");
async function wrangler(args, { capture = false, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: root,
      env: process.env,
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
const createdNewDatabase = !db;
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
const jurisdiction = db.jurisdiction ?? (createdNewDatabase ? "eu" : undefined);
if (jurisdiction) config.d1_databases[0].jurisdiction = jurisdiction;
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
  input: process.env.TEZISCE_SYNC_SETUP_KEY,
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
const health = await fetch(url + "/health", {
  signal: AbortSignal.timeout(20000),
});
if (!health.ok || (await health.json()).service !== "tezisce-encrypted-sync")
  throw Error("The deployed health endpoint did not pass verification.");
console.log(`Verified sync endpoint: ${url}`);
if (process.env.GITHUB_OUTPUT)
  await appendFile(process.env.GITHUB_OUTPUT, `url=${url}\n`);
if (process.env.GITHUB_STEP_SUMMARY)
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `## TEŽIŠČE: Cloudflare\n\nVerified endpoint: ${url}\n\nThe database contains ciphertext only. No personal vault was created by deployment.\n`,
  );
