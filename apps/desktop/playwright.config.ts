import { defineConfig, devices } from "@playwright/test";

const apiPort = Number(process.env.MIO_E2E_API_PORT ?? 4223);
const webPort = Number(process.env.MIO_E2E_WEB_PORT ?? 5273);

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: `cross-env MIO_APP_DATA_DIR=.mio-test/app-data MIO_CACHE_DIR=.mio-test/cache MIO_API_PORT=${apiPort} pnpm dev:api`,
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: false,
      timeout: 120000
    },
    {
      command: `pnpm exec vite preview --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: `http://127.0.0.1:${webPort}`,
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
