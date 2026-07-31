import { defineConfig, devices } from "@playwright/test";

// E2E runs against a already-running app (BASE_URL) or boots `next start`.
// Requires a live database, so it is not part of `npm run verify`.
const PORT = process.env.E2E_PORT || "3100";
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: BASE_URL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `npm run start -- -p ${PORT}`, url: BASE_URL, timeout: 120_000, reuseExistingServer: !process.env.CI },
});
