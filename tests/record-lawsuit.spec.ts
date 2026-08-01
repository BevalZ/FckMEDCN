import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 病历质量反哺诉讼（深挖第五部分 R5 落地）回归：
// record_sloppy（病历书写差）→ 第 4 季起 career_record_sloppy_lawsuit 解锁；
// record_fixed（整改了）/无病历 flag → 不可达（病历干净的人不会在庭上被抓把柄）。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
}

test('病历质量反哺诉讼：书写差才解锁把柄事件', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { ev, stats: st } = (window as any).__mod;
    const base = st.createDefaultStats();
    const reach = (flags: string[], id: string) =>
      ev.getAvailableEvents('career', new Set(flags), { ...base }, new Set(), 5, 'single')
        .some((e: any) => e.id === id);
    return {
      exist: ev.ALL_EVENTS.some((e: any) => e.id === 'career_record_sloppy_lawsuit'),
      sloppyOpen: reach(['record_sloppy'], 'career_record_sloppy_lawsuit'),
      fixedGated: reach(['record_fixed'], 'career_record_sloppy_lawsuit'),
      bareGated: reach([], 'career_record_sloppy_lawsuit'),
    };
  });
  console.log('  病历反哺诉讼:', JSON.stringify(r));
  expect(r.exist, 'career_record_sloppy_lawsuit 应存在').toBe(true);
  expect(r.sloppyOpen, 'record_sloppy 时应解锁把柄事件').toBe(true);
  expect(r.fixedGated, '整改病历（record_fixed）后不应有把柄').toBe(false);
  expect(r.bareGated, '无病历 flag 时不应有把柄').toBe(false);
});
