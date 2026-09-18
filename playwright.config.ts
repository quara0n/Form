import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  webServer: {
    // Egen port, slik at testene alltid kjører mot en server de starter selv.
    command:
      "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5273 --strictPort",
    url: "http://127.0.0.1:5273",
    reuseExistingServer: !process.env.CI,
    env: { VITE_LOCAL_ONLY: "1" },
  },
  use: {
    baseURL: "http://127.0.0.1:5273",
    channel: "chrome",
    viewport: { width: 1440, height: 1000 },
    headless: true,
  },
  reporter: "list",
});
