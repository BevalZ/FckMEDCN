import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  // 冷启动偶发超时（Vite 转译 Phaser ~1.4MB）：失败重试一次即可
  retries: 1,
  // 串行执行：多 worker 会并发抢同一个 Vite dev server，冷启动转译期容易超时；
  // 且各用例都会 localStorage.clear()，并行会互相干扰存档状态。
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5173/',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173/',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
