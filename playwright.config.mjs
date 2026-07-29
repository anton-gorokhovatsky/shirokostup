import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4187",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "python3 -m http.server 4187",
    url: "http://127.0.0.1:4187",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        browserName: "chromium",
        hasTouch: true,
        isMobile: true,
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "mobile-webkit",
      use: {
        browserName: "webkit",
        hasTouch: true,
        isMobile: true,
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
