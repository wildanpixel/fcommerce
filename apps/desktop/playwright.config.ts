import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5273",
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: "cross-env MIO_APP_DATA_DIR=.mio-test/app-data MIO_CACHE_DIR=.mio-test/cache MIO_API_PORT=4223 pnpm dev:api",
      url: "http://127.0.0.1:4223/api/health",
      reuseExistingServer: false,
      timeout: 120000
    },
    {
      command: "pnpm preview:web:test",
      url: "http://127.0.0.1:5273",
      reuseExistingServer: false,
      timeout: 120000
    }
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
