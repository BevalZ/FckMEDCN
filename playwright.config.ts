import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/globalSetup.ts',
  // 生产子路径用例由 playwright.preview.config.ts 在 dist + /FckMedCN/ 下单独执行。
  testIgnore: 'production-subpath.spec.ts',
  // 冷启动首个用例要现场转译 Phaser（~1.4MB），机器繁忙时 60s 不够，
  // balance-sim（字母序第一）曾连续两轮全量因此 flaky。放宽到 120s；
  // 正常用例几秒即过，超时上限只约束真挂死。
  timeout: 120000,
  // 重试作为兜底保留（冷启动以外的偶发环境噪声）
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
