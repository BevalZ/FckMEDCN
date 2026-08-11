import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

test('快讯持续滚动、及时换条，重复刷新不重置队首', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((scene: any) => scene.sys.settings.key === 'TitleScene'),
    null,
    { timeout: 60000 },
  );

  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.patchState({ stage: 'undergrad', year: 2024, quarter: 3, turnsInStage: 0 });
    (window as any).game.scene.getScene('TitleScene').scene.start('CampusScene');
  });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((scene: any) => scene.sys.settings.key === 'CampusScene'),
    null,
    { timeout: 60000 },
  );

  const before = await page.evaluate(() => {
    const ticker: any = (window as any).game.scene.getScene('CampusScene').news;
    return {
      count: ticker.headlines.length,
      headline: ticker.text.text,
      label: ticker.labelText.text,
      x: ticker.text.x,
      duration: ticker.tween.duration,
    };
  });
  expect(before.count).toBeGreaterThan(1);
  expect(before.label).toBe('游戏内推演');
  expect(before.duration, '单条快讯不应长时间霸占滚动栏').toBeLessThanOrEqual(12000);

  await page.waitForTimeout(250);
  const movedX = await page.evaluate(
    () => (window as any).game.scene.getScene('CampusScene').news.text.x,
  );
  expect(movedX).toBeLessThan(before.x);

  const sequence = await page.evaluate(() => {
    const ticker: any = (window as any).game.scene.getScene('CampusScene').news;
    const first = ticker.text.text;
    ticker.tween.complete();
    const second = ticker.text.text;
    ticker.refresh([...ticker.headlines]);
    return { first, second, afterSameRefresh: ticker.text.text };
  });

  expect(sequence.second).not.toBe(sequence.first);
  expect(sequence.afterSameRefresh, '相同数据刷新不应把轮播重置到第一条').toBe(sequence.second);
});

test('快讯库超过 3000 条且每个季度都有充足的不重复内容', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod?.news, null, { timeout: 60000 });

  const result = await page.evaluate(() => {
    const items = (window as any).__mod.news.NEWS_TICKER as Array<{
      id: string;
      year: number;
      quarter: number;
      headline: string;
    }>;
    const quarterCounts = new Map<string, number>();
    for (const item of items) {
      const key = `${item.year}Q${item.quarter}`;
      quarterCounts.set(key, (quarterCounts.get(key) ?? 0) + 1);
    }
    return {
      count: items.length,
      uniqueIds: new Set(items.map(item => item.id)).size,
      uniqueHeadlines: new Set(items.map(item => item.headline)).size,
      quarterSlots: quarterCounts.size,
      minPerQuarter: Math.min(...quarterCounts.values()),
    };
  });

  expect(result.count).toBeGreaterThanOrEqual(3000);
  expect(result.uniqueIds).toBe(result.count);
  expect(result.uniqueHeadlines).toBe(result.count);
  expect(result.quarterSlots).toBe(23 * 4);
  expect(result.minPerQuarter).toBeGreaterThanOrEqual(36);
});

test('阶段最低年龄跳跃同步推进年份，出生年份保持不变', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod?.newsScheduler, null, { timeout: 60000 });
  const timeline = await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'career', year: 2048, stats: { ...gs.getState().stats, age: 42 } });
    const snapshots = [{ stage: 'career', year: 2048, age: 42 }];
    for (const stage of ['pinnacle', 'retirement', 'eternity']) {
      gs.enterStage(stage);
      const state = gs.getState();
      snapshots.push({ stage, year: state.year, age: state.stats.age });
    }
    return snapshots;
  });

  expect(timeline).toEqual([
    { stage: 'career', year: 2048, age: 42 },
    { stage: 'pinnacle', year: 2056, age: 50 },
    { stage: 'retirement', year: 2071, age: 65 },
    { stage: 'eternity', year: 2076, age: 70 },
  ]);
  expect(new Set(timeline.map(item => item.year - item.age))).toEqual(new Set([2006]));
});

test('晚年新闻调度只返回带当前时间的个人、学生和家庭回声', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod?.newsScheduler, null, { timeout: 60000 });
  const echoes = await page.evaluate(() => {
    const { newsScheduler } = (window as any).__mod;
    const fired = new Set<string>();
    return ['pinnacle', 'retirement', 'eternity'].map((stage, index) => {
      const [item] = newsScheduler.scheduleNewsForQuarter({
        stage,
        year: 2060 + index * 10,
        quarter: index + 1,
        firedIds: fired,
      });
      fired.add(item.id);
      return item;
    });
  });

  expect(echoes.map(item => item.id)).toEqual(['late_echo_patient', 'late_echo_student', 'late_echo_family']);
  expect(echoes.map(item => [item.year, item.quarter])).toEqual([[2060, 1], [2070, 2], [2080, 3]]);
  expect(echoes.every(item => /回声/.test(item.headline) && !item.headline.startsWith('【'))).toBe(true);
});
