import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const executable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const appURL = `http://127.0.0.1:4173${process.env.TEST_BASE_PATH || "/"}`;
const safari = process.env.TEST_BROWSER === "webkit";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  use: {
    baseURL: appURL,
    browserName: safari ? "webkit" : "chromium",
    launchOptions: safari
      ? {}
      : { executablePath: executable, args: ["--no-sandbox"] },
  },
  webServer: {
    command: "npm run preview -- --port 4173",
    env: { VITE_BASE_PATH: process.env.TEST_BASE_PATH || "/" },
    url: appURL,
    reuseExistingServer: true,
  },
});
