import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  testMatch: "*.spec.ts",
  workers: 2,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4174", timezoneId: "Europe/Rome", screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: { command: "node tests/ui/server.mjs", url: "http://127.0.0.1:4174", reuseExistingServer: false, timeout: 60000 },
});
