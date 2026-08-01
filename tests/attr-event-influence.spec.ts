import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 属性分配对随机事件的影响：
// 1) 成绩(academic) → 起始知识 → 知识门槛事件的可用性（高知识解锁考研保研/低知识触发学业警示）；
// 2) 运气(luck) → 手写主线事件出现率（运气越高越容易抽到主线叙事，统计验证）。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('成绩决定知识门槛随机事件是否可用', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ev, stats: st } = (window as any).__mod;
    const base = st.createDefaultStats();
    const has = (attrs: any, id: string, turn: number) => {
      gs.resetGame();
      gs.patchState({ attrs, stats: { ...base, knowledge: 30 + (attrs.academic ?? 0) * 5 } });
      const pool = ev.getAvailableEvents('undergrad', new Set(), gs.getState().stats, new Set(), turn, 'single');
      return pool.some((e: any) => e.id === id);
    };
    return {
      // 考研保研要求知识 ≥55：成绩5（知识55）可用，成绩0（知识30）不可用
      kaoyanHigh: has({ academic: 5 }, 'postgrad_kaoyan_vs_baoyan', 12),
      kaoyanLow: has({ academic: 0 }, 'postgrad_kaoyan_vs_baoyan', 12),
      // 学业警示要求知识 ≤45：成绩0（30）可用，成绩5（55）不可用
      probationLow: has({ academic: 0 }, 'ug_academic_probation', 5),
      probationHigh: has({ academic: 5 }, 'ug_academic_probation', 5),
    };
  });
  console.log('  成绩→事件可用性:', JSON.stringify(r));
  expect(r.kaoyanHigh, '成绩5应解锁考研保研').toBe(true);
  expect(r.kaoyanLow, '成绩0不应触发考研保研').toBe(false);
  expect(r.probationLow, '成绩0应可能触发学业警示').toBe(true);
  expect(r.probationHigh, '成绩5不应触发学业警示').toBe(false);
});

test('运气提高手写主线事件出现率', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    const rate = (luck: number) => {
      gs.resetGame();
      gs.patchState({ attrs: { family: 2, academic: 3, luck, looks: 2 }, turnsInStage: 8 });
      let hand = 0;
      const N = 300;
      for (let i = 0; i < N; i++) {
        const e = tf.drawStorylet('undergrad', new Set());
        if (e && !e.id.startsWith('gen_')) hand++;
      }
      return hand / N;
    };
    return { luck0: rate(0), luck5: rate(5) };
  });
  console.log('  手写主线率(运气0/5):', JSON.stringify(r));
  expect(r.luck5, '高运气应显著高于低运气的手写事件率').toBeGreaterThan(r.luck0 + 0.1);
});
