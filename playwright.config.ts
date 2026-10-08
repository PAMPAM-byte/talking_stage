import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3000", browserName: "chromium", channel: "msedge", headless: true, trace: "retain-on-failure" },
  webServer: { command: "npm run dev -- --port 3000", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120000 },
});
