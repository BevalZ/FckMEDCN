import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 事件池性能与去重回归：
// 1) 阶段索引必须与旧的全池 stage 过滤完全等价，并保持事件顺序；
// 2) getAvailableEvents 在最大阶段池上的平均耗时应低于 2ms；
// 3) 固定随机种子抽取 24 个职业事件，标题唯一率不得低于 60%。

const BASE = 'http://127.0.0.1:5173/';

test.setTimeout(180000);

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 120000 });
}

test('阶段索引与全池过滤等价且单次筛选低于 2ms', async ({ page }) => {
  await boot(page);

  const report = await page.evaluate(() => {
    const { ev, stats } = (window as any).__mod;
    const stages = ['undergrad', 'internship', 'guipei', 'master', 'phd', 'jobhunt', 'career'];
    const baseStats = stats.createDefaultStats();
    const indexed = stages.map((stage) => ev.getEventsForStage(stage).map((e: any) => e.id));
    const scanned = stages.map((stage) => ev.ALL_EVENTS
      .filter((e: any) => (Array.isArray(e.stage) ? e.stage : [e.stage]).includes(stage))
      .map((e: any) => e.id));

    // 先热身，减少浏览器 JIT 首次编译对微基准的干扰。
    for (let i = 0; i < 100; i++) {
      ev.getAvailableEvents('career', new Set(), baseStats, new Set(), 10, 'single');
    }
    const rounds = 1000;
    let candidates = 0;
    const started = performance.now();
    for (let i = 0; i < rounds; i++) {
      candidates += ev.getAvailableEvents('career', new Set(), baseStats, new Set(), 10, 'single').length;
    }
    const averageMs = (performance.now() - started) / rounds;
    return { indexed, scanned, averageMs, candidates };
  });

  expect(report.indexed, '阶段索引必须保持全池扫描的内容与顺序').toEqual(report.scanned);
  expect(report.candidates, '微基准必须实际消费筛选结果').toBeGreaterThan(0);
  console.log(`  career getAvailableEvents 平均 ${report.averageMs.toFixed(4)}ms`);
  expect(report.averageMs, 'career 单次事件筛选应低于 2ms').toBeLessThan(2);
});

test('职业期连续 24 次抽取的标题唯一率不低于 60%', async ({ page }) => {
  await boot(page);

  const report = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'career', turnsInStage: 10 });

    const originalRandom = Math.random;
    let seed = 20260804;
    Math.random = () => {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };

    try {
      const fired = new Set<string>();
      const titles: string[] = [];
      const ids: string[] = [];
      for (let i = 0; i < 24; i++) {
        const picked = tf.drawStorylet('career', fired);
        if (!picked) continue;
        ids.push(picked.id);
        titles.push(picked.title);
        if (picked.once) fired.add(picked.id);
      }
      return {
        draws: titles.length,
        uniqueTitles: new Set(titles).size,
        uniqueIds: new Set(ids).size,
        titleRatio: new Set(titles).size / titles.length,
      };
    } finally {
      Math.random = originalRandom;
    }
  });

  console.log('  职业期事件多样性:', JSON.stringify(report));
  expect(report.draws, '职业期应连续抽到 24 个事件').toBe(24);
  expect(report.uniqueIds, '事件 id 去重率应至少 80%').toBeGreaterThanOrEqual(20);
  expect(report.titleRatio, '事件标题唯一率应至少 60%').toBeGreaterThanOrEqual(0.6);
});
