import { test, expect, type Page } from "@playwright/test";
import { initialState, type State } from "../src/model";
async function get(page: Page, key = "current"): Promise<any> {
  return page.evaluate(
    (key) =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("tezisce", 1);
        r.onsuccess = () => {
          const q = r.result.transaction("state").objectStore("state").get(key);
          q.onsuccess = () => {
            r.result.close();
            resolve(q.result);
          };
          q.onerror = () => reject(q.error);
        };
      }),
    key,
  );
}
async function seed(page: Page, name: string) {
  await page.goto("./");
  await page.getByRole("heading", { name: /Tvoj tempo/ }).waitFor();
  const state = initialState();
  state.profile.name = name;
  state.measurements = [
    { id: name, date: "2026-10-15", kind: "weight", value: 100 },
  ];
  await page.evaluate(
    (s) =>
      new Promise<void>((resolve) => {
        const r = indexedDB.open("tezisce", 1);
        r.onsuccess = () => {
          const tx = r.result.transaction("state", "readwrite");
          tx.objectStore("state").put(s, "current");
          tx.oncomplete = () => {
            r.result.close();
            resolve();
          };
        };
      }),
    state,
  );
  await page.reload();
  await page.getByRole("heading", { name: /Tvoj tempo/ }).waitFor();
  await page.getByRole("button", { name: "Nastavitve in profil" }).click();
}
test("connection attempts always show feedback, including missing consent and Safari network failure", async ({
  page,
}) => {
  await seed(page, "Lokalni podatki");
  const panel = page.getByRole("region", { name: "Sinhronizacija naprav" });
  await panel
    .getByRole("button", { name: "Ustvari šifrirano shrambo" })
    .click();
  await expect(panel.getByRole("alert")).toContainText("Najprej označi");
  await panel.getByRole("checkbox", { name: /Dovolim šifrirano/ }).check();
  await panel
    .getByRole("button", { name: "Ustvari šifrirano shrambo" })
    .click();
  await expect(panel.getByRole("alert")).toContainText("namestitveno kodo");
  await page.route("https://tezisce-sync.tim-bajc.workers.dev/**", (route) =>
    route.abort(),
  );
  await panel
    .getByRole("button", { name: "Preveri povezavo s strežnikom" })
    .click();
  await expect(panel.getByRole("alert")).toContainText("Safari ni uspel");
  expect((await get(page)).profile.name).toBe("Lokalni podatki");
});
test("two devices share encrypted data and preserve the previous local collection", async ({
  browser,
}) => {
  // Network routing cannot reliably intercept requests controlled by a service worker in WebKit.
  // The independent PWA/offline regression keeps service workers enabled.
  const a = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: "block",
    }),
    b = await browser.newContext({ serviceWorkers: "block" });
  let remote: any,
    auth = "",
    id = "",
    revision = 0;
  const requests: string[] = [];
  let failA = false,
    failB = false;
  for (const [context, isA] of [
    [a, true],
    [b, false],
  ] as const)
    await context.route(
      "https://tezisce-sync.test.workers.dev/**",
      async (route) => {
        if ((isA && failA) || (!isA && failB)) {
          await route.abort();
          return;
        }
        const req = route.request(),
          headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers":
              "Authorization,Content-Type,If-Match,X-Setup-Key",
            "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
            "Content-Type": "application/json",
          };
        const reply = (status: number, body: unknown) =>
          route.fulfill({ status, headers, body: JSON.stringify(body) });
        if (req.method() === "OPTIONS") {
          await reply(200, {});
          return;
        }
        const supplied = req.headers().authorization ?? "";
        if (req.method() === "POST") {
          if (revision) {
            await reply(409, {});
            return;
          }
          auth = supplied;
          id = req.url();
          remote = req.postDataJSON();
          requests.push(req.postData()!);
          revision = 1;
          await reply(201, { revision });
          return;
        }
        if (supplied !== auth || req.url() !== id) {
          await reply(401, {});
          return;
        }
        if (req.method() === "GET") {
          await reply(200, { revision, payload: remote });
          return;
        }
        if (req.headers()["if-match"] !== `"${revision}"`) {
          await reply(409, {});
          return;
        }
        remote = req.postDataJSON();
        requests.push(req.postData()!);
        revision++;
        await reply(200, { revision });
      },
    );
  const phone = await a.newPage(),
    desktop = await b.newPage();
  phone.on("console", (message) => {
    if (message.type() === "error")
      console.log("Synthetic WebKit connection diagnostic:", message.text());
  });
  phone.on("requestfailed", (request) =>
    console.log(
      "Synthetic request failure:",
      request.method(),
      new URL(request.url()).hostname,
      request.failure()?.errorText,
    ),
  );
  await seed(phone, "Zasebni telefon");
  console.log(
    "Synthetic crypto capability:",
    await phone.evaluate(async () => {
      try {
        const key = await crypto.subtle.importKey(
          "raw",
          new Uint8Array(32),
          "AES-GCM",
          false,
          ["encrypt", "decrypt"],
        );
        await crypto.subtle.encrypt(
          {
            name: "AES-GCM",
            iv: new Uint8Array(12),
            additionalData: new TextEncoder().encode(
              "tezisce-encrypted-sync:v1",
            ),
          },
          key,
          new TextEncoder().encode("test"),
        );
        return { secure: isSecureContext, encrypted: true };
      } catch (error) {
        return {
          secure: isSecureContext,
          error: (error as Error).name + ": " + (error as Error).message,
        };
      }
    }),
  );
  const panel = phone.getByRole("region", { name: "Sinhronizacija naprav" });
  await panel
    .getByLabel("Naslov strežnika Cloudflare")
    .fill("https://tezisce-sync.test.workers.dev");
  await panel
    .getByLabel("Namestitvena koda shrambe")
    .fill("synthetic-setup-secret-123456789012345");
  await panel.getByRole("checkbox", { name: /Dovolim šifrirano/ }).check();
  await panel
    .getByRole("button", { name: "Ustvari šifrirano shrambo" })
    .click();
  await expect
    .poll(
      async () =>
        revision ||
        (await panel.getByRole("alert").allTextContents()).join(" ") ||
        0,
    )
    .toBe(1);
  await expect(
    panel.getByRole("button", { name: "Pokaži kodo za drugo napravo" }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Pokaži kodo za drugo napravo" })
    .click();
  const code = await panel.getByLabel("Zasebna koda za povezavo").inputValue();
  expect(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(requests.join("")).not.toContain("Zasebni telefon");
  expect(Object.keys(remote).sort()).toEqual(["data", "iv", "version"]);
  await seed(desktop, "Prejšnji računalnik");
  const second = desktop.getByRole("region", { name: "Sinhronizacija naprav" });
  await second.getByRole("combobox").selectOption("join");
  await second.getByLabel("Koda za povezavo iz prve naprave").fill(code);
  await second.getByRole("checkbox", { name: /Dovolim šifrirano/ }).check();
  await second
    .getByRole("button", { name: "Poveži napravo in prevzemi podatke" })
    .click();
  await expect
    .poll(async () => (await get(desktop)).profile.name)
    .toBe("Zasebni telefon");
  expect((await get(desktop, "device:sync-safety"))[0].state.profile.name).toBe(
    "Prejšnji računalnik",
  );
  await desktop.getByRole("button", { name: "Nastavitve in profil" }).click();
  await desktop
    .getByRole("button", { name: "Dodaj težo", exact: true })
    .click();
  await desktop.getByRole("dialog").locator("input[name=value]").fill("99");
  await desktop.getByRole("button", { name: "Shrani meritev" }).click();
  await expect.poll(() => revision, { timeout: 15000 }).toBeGreaterThan(1);
  await panel.getByRole("button", { name: "Sinhroniziraj zdaj" }).click();
  await expect.poll(async () => (await get(phone)).measurements.length).toBe(2);
  expect((await get(phone)).measurements).toEqual(
    (await get(desktop)).measurements,
  );
  // Failed cloud requests do not disable local work or drop local records.
  failA = true;
  await phone.getByRole("button", { name: "Nastavitve in profil" }).click();
  await phone.getByRole("button", { name: "Dodaj težo", exact: true }).click();
  await phone.getByRole("dialog").locator("input[name=value]").fill("98");
  await phone.getByRole("button", { name: "Shrani meritev" }).click();
  await expect.poll(async () => (await get(phone)).measurements.length).toBe(3);
  failA = false;
  await phone.getByRole("button", { name: "Nastavitve in profil" }).click();
  await panel.getByRole("button", { name: "Sinhroniziraj zdaj" }).click();
  await desktop.getByRole("button", { name: "Nastavitve in profil" }).click();
  await second.getByRole("button", { name: "Sinhroniziraj zdaj" }).click();
  await expect
    .poll(async () => (await get(desktop)).measurements.length, {
      timeout: 15000,
    })
    .toBe(3);
  // Concurrent changes to the same record require an explicit choice and retain both copies.
  failA = true;
  failB = true;
  for (const [page, value] of [
    [phone, 101],
    [desktop, 102],
  ] as const) {
    await page.evaluate(
      (value) =>
        new Promise<void>((resolve) => {
          const r = indexedDB.open("tezisce", 1);
          r.onsuccess = () => {
            const tx = r.result.transaction("state", "readwrite"),
              store = tx.objectStore("state"),
              q = store.get("current");
            q.onsuccess = () => {
              const data = q.result;
              data.measurements[0].value = value;
              store.put(data, "current");
            };
            tx.oncomplete = () => {
              r.result.close();
              resolve();
            };
          };
        }),
      value,
    );
    await page.reload();
    await page.getByRole("button", { name: "Nastavitve in profil" }).click();
  }
  const previousRevision = revision;
  failA = false;
  await panel.getByRole("button", { name: "Sinhroniziraj zdaj" }).click();
  await expect.poll(() => revision).toBeGreaterThan(previousRevision);
  failB = false;
  await second.getByRole("button", { name: "Sinhroniziraj zdaj" }).click();
  const acknowledge = second.getByRole("checkbox", {
    name: /Razumem: izbrana/,
  });
  await expect(acknowledge).toBeVisible();
  expect((await get(desktop)).measurements[0].value).toBe(102);
  await acknowledge.check();
  await second
    .getByRole("button", { name: "Uporabi oblačno različico", exact: true })
    .click();
  await expect
    .poll(async () => (await get(desktop)).measurements[0].value)
    .toBe(101);
  const safety = await get(desktop, "device:sync-conflict-safety");
  expect(safety.local.measurements[0].value).toBe(102);
  expect(safety.remote.measurements[0].value).toBe(101);
  await a.close();
  await b.close();
});
