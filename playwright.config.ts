import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/** Runs against the production build (`npm run e2e` builds first), served by `vite preview`. */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // The scene renders with software WebGL in headless Chromium; parallel workers slow every frame down.
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
});
