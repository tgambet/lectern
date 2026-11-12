import { defineConfig, devices } from "@playwright/test";

const port = 4173;
const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? "list" : "line",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // Locally, reuse the installed Chrome instead of downloading a browser.
      use: { ...devices["Desktop Chrome"], ...(ci ? {} : { channel: "chrome" }) },
    },
  ],
  webServer: {
    // Tests run against the production build: CSP and the service worker only exist there.
    command: `${ci ? "" : "pnpm vp build && "}pnpm vp preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !ci,
    timeout: 120_000,
  },
});
