import type { PlaywrightTestConfig } from "@playwright/test";

const PORT = process.env.PORT || "3100";
const HOST = process.env.HOST || "127.0.0.1";

const config: PlaywrightTestConfig = {
  testDir: "tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --hostname ${HOST} --port ${PORT}`,
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
};

export default config;
