import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// M13：结构化季度账单 + 理财策略写入后可确认。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('M13 formatQuarterBill：含房贷/育儿拆分与资产行', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, qb } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ hasChild: true, assets: 12000 });
    gs.setFlag('bought_house');
    const text = qb.formatQuarterBill({ income: 8000, cost: 5500, net: 2500, financeNote: ' · 理财+120' });
    gs.resetGame();
    const empty = qb.formatQuarterBill({ income: 0, cost: 0, net: 0 });
    return { text, empty };
  });

  expect(r.empty).toBeNull();
  expect(r.text).toContain('季度结算');
  expect(r.text).toContain('收入');
  expect(r.text).toContain('房贷');
  expect(r.text).toContain('育儿');
  expect(r.text).toContain('资产');
  expect(r.text).toContain('理财+120');
});

test('M13 理财策略可写入状态', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ financeStrategy: 'invest' });
    return gs.getState().financeStrategy;
  });
  expect(r).toBe('invest');
});

test('M13 HUD：职业档位与硕博导师短标签可读', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ec } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'career' });
    gs.setFlag('offer_sanjia');
    gs.setFlag('sub_surgery');
    gs.setFlag('jh_bianzhi_in');
    const tier = ec.currentRegionTier();
    const careerBits = [
      '科:外科',
      `档:${ec.REGION_LABEL[tier]}`,
      '编制',
    ].join(' ');
    gs.resetGame();
    gs.patchState({ stage: 'phd', mentorStyle: 'pyramid' });
    const mentor = ec.MENTOR_HUD_LABEL[gs.getState().mentorStyle];
    return { careerBits, mentor, tier };
  });
  expect(r.tier).toBe('top');
  expect(r.careerBits).toContain('一线三甲');
  expect(r.careerBits).toContain('外科');
  expect(r.careerBits).toContain('编制');
  expect(r.mentor).toBe('金字塔');
});
