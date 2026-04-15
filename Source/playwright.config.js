const config = {
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: {
      width: 1440,
      height: 960,
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
    {
      name: "webkit",
      use: {
        browserName: "webkit",
      },
    },
  ],
  webServer: [
    {
      command: "pnpm dev:server",
      port: 4174,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "pnpm dev:app",
      port: 4173,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
};

export default config;
