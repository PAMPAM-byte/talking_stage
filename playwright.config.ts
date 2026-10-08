import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3103", browserName: "chromium", channel: "msedge", headless: true, trace: "retain-on-failure" },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --port 3103", url: "http://localhost:3103", reuseExistingServer: false, timeout: 120000,
    env: { TALKINGSTAGE_PREVIEW_TEST: "1", NEXT_PUBLIC_TALKINGSTAGE_MODE: "mock" },
  },
});
