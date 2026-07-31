import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 结局"数据对比系统"回归：
// 1) compareEnding 判定（偏低/区间内/偏高）与格式化；
// 2) 全部 15 个结局都有对比表；未知 endingId 降级到默认表；
// 3) EndingScene 渲染逐项对比（你的数据 vs 真实数据 + 判定标签）。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'TitleScene'),
    null, { timeout: 30000 },
  );
}

test('数据对比：判定/格式化/覆盖/降级', async ({ page }) => {
  await boot(page);

  const r = await page.evaluate(() => {
    const { cmp, en, gs } = (window as any).__mod;
    const s = gs.getState();
    const state = { ...s, stats: { ...s.stats, age: 45, money: 500000, papers: 10 } };

    const rows = cmp.compareEnding('stable_at_45', state);
    const low = cmp.compareEnding('stable_at_45', { ...state, stats: { ...state.stats, money: 5000 } });
    const fallback = cmp.compareEnding('no_such_ending', state);

    const ids = en.ENDINGS.map((e: any) => e.id);
    const missing = ids.filter((id: string) => !cmp.ENDING_COMPARISONS[id]);

    return {
      rows,
      moneyLow: low.find((x: any) => x.label === '存款'),
      fallbackId: fallback,
      missing,
    };
  });

  const byLabel = (l: string) => r.rows.find((x: any) => x.label === l)!;
  expect(byLabel('年龄').yoursText, '年龄格式').toBe('45岁');
  expect(byLabel('存款').yoursText, '存款格式').toBe('¥500,000');
  expect(byLabel('论文').yoursText, '论文格式').toBe('10篇');
  expect(byLabel('年龄').verdict, '45 岁在 40-48 区间内').toBe('mid');
  expect(byLabel('存款').verdict, '50 万在 30-80 万区间内').toBe('mid');
  expect(byLabel('论文').verdict, '10 篇高于 3-8').toBe('high');
  expect(r.moneyLow.verdict, '5 千低于 30-80 万').toBe('low');
  expect(r.fallbackId.length, '未知结局应降级到默认表').toBeGreaterThan(0);
  expect(r.fallbackId[0].label, '降级表首行是年龄').toBe('年龄');
  expect(r.missing, '每个结局都应有对比表').toEqual([]);
});

test('数据对比：EndingScene 渲染逐项对比表', async ({ page }) => {
  await boot(page);

  // 构造"处于区间内"的状态后直接进入结局页
  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    const s = gs.getState();
    gs.patchState({ stats: { ...s.stats, age: 45, money: 500000, papers: 5 } });
    (window as any).game.scene.start('EndingScene', { endingId: 'stable_at_45' });
  });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'EndingScene'),
    null, { timeout: 30000 },
  );

  const texts = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScene('EndingScene');
    return scene.children.list.filter((o: any) => o.type === 'Text').map((o: any) => o.text as string);
  });
  expect(texts.some((t: string) => t.includes('你的数据')), '左列头').toBe(true);
  expect(texts.some((t: string) => t.includes('真实数据')), '右列头').toBe(true);
  expect(texts.some((t: string) => t.includes('¥500,000')), '你的存款值').toBe(true);
  expect(texts.some((t: string) => t.includes('在参考区间内')), '区间判定标签').toBe(true);
  expect(texts.some((t: string) => t.includes('三甲副主任同龄存款')), '真实参照文本').toBe(true);
  expect(texts.some((t: string) => t.includes('家人/子女')), '信息行仍保留').toBe(true);
});
