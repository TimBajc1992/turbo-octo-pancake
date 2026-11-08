import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const executable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const testPort = process.env.TEST_PORT || "4174";
const appOrigin = `http://127.0.0.1:${testPort}`;
const appURL = `${appOrigin}${process.env.TEST_BASE_PATH || "/"}`;
const safari = process.env.TEST_BROWSER === "webkit";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  use: {
    baseURL: appURL,
    browserName: safari ? "webkit" : "chromium",
    launchOptions: safari
      ? {}
      : { executablePath: executable, args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--disable-dev-shm-usage"] },
  },
  projects: [
    {
      name: "tezisce-compatibility",
      testIgnore: /moc-forma.*\.spec\.ts/,
      use: {
        storageState: {
          cookies: [],
          origins: [
            {
              origin: appOrigin,
              localStorage: [{ name: "moc-forma:interface", value: "legacy" }],
            },
          ],
        },
      },
    },
    {
      name: "moc-forma-desktop",
      testMatch: /moc-forma.*\.spec\.ts/,
      use: { viewport: { width: 1440, height: 1050 } },
    },
    {
      name: "moc-forma-mobile",
      testMatch: /moc-forma.*\.spec\.ts/,
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${testPort}`,
    env: { VITE_BASE_PATH: process.env.TEST_BASE_PATH || "/" },
    url: appURL,
    reuseExistingServer: true,
  },
});
