import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 职业经济损失事件回归：医保拒付 / 病历扣费 在职业池可达，且所有选项都造成金钱损失。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('医保拒付/病历扣费：可达且造成经济损失', async ({ page }) => {
  await boot(page);

  const r = await page.evaluate(() => {
    const { ev, stats: st } = (window as any).__mod;
    const base = st.createDefaultStats();
    const IDs = ['career_fin_insurance_denial', 'career_fin_record_fine'];

    return IDs.map((id) => {
      let firstHit = -1;
      for (let turn = 1; turn <= 12; turn++) {
        const pool = ev.getAvailableEvents('career', new Set(), { ...base }, new Set(), turn, 'single');
        if (pool.some((e: any) => e.id === id)) { firstHit = turn; break; }
      }
      const e = ev.ALL_EVENTS.find((x: any) => x.id === id);
      const allNegative = (e?.choices ?? []).every((c: any) => (c.delta?.money ?? 0) < 0);
      return { id, firstHit, allNegative, choices: e?.choices?.length ?? 0 };
    });
  });

  for (const x of r) {
    console.log(`  ${x.firstHit > 0 && x.allNegative ? '✓' : '✗'} ${x.id}: 首次可达第${x.firstHit}回合 · 全选项扣钱=${x.allNegative}`);
    expect(x.firstHit, `${x.id} 应在职业池可达`).toBeGreaterThan(0);
    expect(x.allNegative, `${x.id} 所有选项都应是经济损失`).toBe(true);
    expect(x.choices, `${x.id} 应有选项`).toBeGreaterThanOrEqual(2);
  }
});
