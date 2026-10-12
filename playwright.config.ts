import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:5173", browserName: "chromium", headless: true },
  webServer: {
    command: "npm run dev -- --host 0.0.0.0 --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "https://journey-test.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    },
  },
});
