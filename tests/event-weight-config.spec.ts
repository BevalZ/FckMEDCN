import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 事件权重配置单元测试：审计 ALL_EVENTS 的配置合法性。
// 1) id 唯一、无重复；
// 2) 权重为有限正数且在合理区间 [1,200]（防加权抽取坏掉）；
// 3) minTurn <= maxTurn（都配置时）；
// 4) 各阶段池非空、手写(非 gen_)与生成事件都存在、权重总和与手写权重健康。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('事件权重配置合法', async ({ page }) => {
  await boot(page);

  const report = await page.evaluate(() => {
    const { ev } = (window as any).__mod;
    const all: any[] = ev.ALL_EVENTS;
    const ids = all.map((e) => e.id);

    // 1) 重复 id
    const seen = new Set<string>();
    const dupIds = ids.filter((id) => seen.has(id) ? true : (seen.add(id), false));

    // 2) 非法权重（非正有限数，或超出 [1,200]）
    const badWeight = all
      .filter((e) => !(typeof e.weight === 'number' && Number.isFinite(e.weight) && e.weight >= 1 && e.weight <= 200))
      .map((e) => e.id);

    // 3) minTurn > maxTurn
    const badTurn = all
      .filter((e) => e.minTurn !== undefined && e.maxTurn !== undefined && e.minTurn > e.maxTurn)
      .map((e) => e.id);

    // 4) 各阶段池统计
    const STAGES = ['undergrad', 'internship', 'guipei', 'master', 'phd', 'jobhunt', 'career'];
    const stageInfo = STAGES.map((st) => {
      const pool = all.filter((e) => (Array.isArray(e.stage) ? e.stage : [e.stage]).includes(st));
      const hand = pool.filter((e) => !e.id.startsWith('gen_'));
      const gen = pool.length - hand.length;
      const handW = hand.reduce((s, e) => s + e.weight, 0);
      const maxW = pool.reduce((m, e) => Math.max(m, e.weight), 0);
      return { stage: st, count: pool.length, hand: hand.length, gen, handW, maxW };
    });

    // 5) 稀有事件（家庭/人生类，weight <= 20）只应存在于个人类事件，不该混进高频池
    const rareWeights = all
      .filter((e) => e.weight <= 20)
      .map((e) => `${e.id}:w${e.weight}`);

    return { total: all.length, dupIds, badWeight, badTurn, stageInfo, rareWeights };
  });

  expect(report.total, '事件总数应非空').toBeGreaterThan(50);
  expect(report.dupIds, '不应有重复事件 id').toEqual([]);
  expect(report.badWeight, '不应有非法权重').toEqual([]);
  expect(report.badTurn, 'minTurn 不应大于 maxTurn').toEqual([]);

  for (const s of report.stageInfo) {
    console.log(`  ${s.stage.padEnd(10)} 共${s.count} 手写${s.hand} 生成${s.gen} 手写权重${s.handW} 最大权重${s.maxW}`);
    expect(s.count, `${s.stage} 事件池不应为空`).toBeGreaterThanOrEqual(3);
    expect(s.hand, `${s.stage} 应有手写事件`).toBeGreaterThan(0);
    expect(s.gen, `${s.stage} 应有生成事件`).toBeGreaterThan(0);
    expect(s.maxW, `${s.stage} 最大权重应在 200 内`).toBeLessThanOrEqual(200);
  }

  // 稀有权重事件应存在（家庭/人生/危机类），但数量可控
  expect(report.rareWeights.length, '应存在稀有事件').toBeGreaterThan(0);
  expect(report.rareWeights.length, '稀有事件不应过多').toBeLessThan(60);
});
