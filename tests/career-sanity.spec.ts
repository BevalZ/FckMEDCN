import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 职业期心理可持续性回归（REVIEW-PLAYABILITY R14 / 深挖第五部分 R28 落地）：
// 儿科被动 sanity -5/季，曾在职业期内形成近乎必死线。修复后：
// 1) 职业期每季被动 +2 sanity（儿科 +4）；
// 2) 纯被动（不做任何事件选择）跑满当前 20 季，儿科 sanity 应保持 > 危机阈值。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('儿科 20 季纯被动心理不崩溃', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf, stats: st } = (window as any).__mod;
    const run = (sub: string) => {
      gs.resetGame();
      gs.patchState({
        stage: 'career', turnsInStage: 0, marital: 'single',
        stats: st.createDefaultStats(), // sanity 85
      });
      gs.setFlag(sub);
      let min = 85;
      for (let t = 0; t < 20; t++) {
        // 纯被动：不领事件，只推季度（模拟最差情形——玩家没有任何回血事件）
        gs.patchState({ turnsInStage: t });
        tf.advanceQuarter('career');
        min = Math.min(min, gs.getState().stats.sanity);
      }
      return { final: gs.getState().stats.sanity, min };
    };
    return {
      peds: run('sub_pediatrics'),
      surgery: run('sub_surgery'),
      internal: run('sub_internal'),
    };
  });
  console.log('  儿科纯被动20季:', JSON.stringify(r.peds), '| 外科:', JSON.stringify(r.surgery), '| 内科:', JSON.stringify(r.internal));
  expect(r.peds.final, '儿科纯被动 20 季最终 sanity 应保持在 60 以上').toBeGreaterThan(60);
  expect(r.peds.min, '儿科纯被动 20 季最低 sanity 应保持在 60 以上').toBeGreaterThan(60);
  expect(r.surgery.final, '外科（体力消耗为主）心理不应崩').toBeGreaterThan(20);
});
