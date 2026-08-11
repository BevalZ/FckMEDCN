import { defineConfig } from '@playwright/test';

const previewUrl = 'http://127.0.0.1:4174/FckMedCN/';

export default defineConfig({
  testDir: './tests',
  testMatch: 'production-subpath.spec.ts',
  timeout: 60000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: previewUrl,
    headless: true,
  },
  webServer: {
    command: 'npm run preview -- --base /FckMedCN/ --port 4174 --strictPort',
    url: previewUrl,
    reuseExistingServer: false,
    timeout: 60000,
  },
});
