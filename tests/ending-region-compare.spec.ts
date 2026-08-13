import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 结局地区对照：同一职称下一线三甲 vs 基层/县城季度可支配收入差，并在 EndingScene 展示。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('同职称下一线三甲可支配高于基层/县城', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ec, stats: st } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({
      stage: 'career',
      familyWealth: 'middle',
      financeStrategy: 'stable',
      stats: { ...st.createDefaultStats(), reputation: 50, money: 20000 },
    });
    gs.setFlag('passed_zhuzhi');
    gs.setFlag('bought_house');
    const cmp = ec.regionDisposableCompare();
    const top = ec.careerFinancialSnapshot('top');
    const county = ec.careerFinancialSnapshot('county');
    return { cmp, topDisp: top.disposable, countyDisp: county.disposable };
  });

  expect(r.topDisp).toBeGreaterThan(r.countyDisp);
  expect(r.cmp.gapTopMinusCounty).toBe(r.topDisp - r.countyDisp);
  expect(r.cmp.blurb).toContain('一线三甲');
  expect(r.cmp.blurb).toContain('基层');
});

test('EndingScene 展示地区对照行', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const { gs, stats: st } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({
      stage: 'career',
      stats: { ...st.createDefaultStats(), age: 45, money: 500000, papers: 5, reputation: 40 },
    });
    gs.setFlag('offer_sanjia');
    gs.setFlag('passed_fugao');
    (window as any).game.scene.start('EndingScene', { endingId: 'stable_at_45' });
  });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'EndingScene'),
    null,
    { timeout: 30000 },
  );

  const texts = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScene('EndingScene');
    return scene.children.list.filter((o: any) => o.type === 'Text').map((o: any) => o.text as string);
  });

  expect(texts.some((t: string) => t.includes('地区对照'))).toBe(true);
  expect(texts.some((t: string) => t.includes('一线三甲'))).toBe(true);
  expect(texts.some((t: string) => t.includes('基层/县城'))).toBe(true);
  expect(texts.some((t: string) => t.includes('同职称对照'))).toBe(true);
  expect(texts.some((t: string) => t.includes('真实数据'))).toBe(false);
});
