const path = require("node:path");
const { defineConfig, devices } = require("@playwright/test");

/** Aliniat cu `e2e/fixtures/auth.fixture.ts` (salvare storageState în setup). */
const AUTH_STORAGE_ABS = path.join(__dirname, "playwright", ".auth", "user.json");

module.exports = defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  captureGitInfo: { commit: false, diff: false },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:64000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts$/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_STORAGE_ABS,
      },
      dependencies: ["setup"],
      testMatch: [
        "**/import-csv-flow.spec.ts",
        "**/lead-management.spec.ts",
        "**/gold-company-view.spec.ts",
        "**/outreach-sequence.spec.ts",
      ],
    },
    {
      name: "chromium-unauth",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ["**/public-auth-shell.spec.ts", "**/auth-login.spec.ts"],
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:64000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
