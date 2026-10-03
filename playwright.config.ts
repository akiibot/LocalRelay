import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/e2e-results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 360, height: 800 },
    serviceWorkers: "allow",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/serve-production.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
