import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 地区/医院经济差异化回归（OPTIMIZATION-ROADMAP R2 / 深挖第五部分 R2 落地）：
// 1) 求职选择决定职业收入系数：三甲 > 市级 > 私立 > 基层；
// 2) 购房首付/月供随地区档位浮动：三甲最贵、基层最便宜；
// 3) 职业阶段不再叠加学校城市溢价（地区由档位单独体现）。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('地区档位决定职业收入与房贷', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ec } = (window as any).__mod;
    // 同职称同声望下，只改地区 flag，比较季度收入
    const incomeOf = (flags: string[]) => {
      gs.resetGame();
      gs.patchState({
        stage: 'career', familyWealth: 'middle', financeStrategy: 'stable',
        stats: { ...gs.getState().stats, reputation: 50, money: 0 },
      });
      for (const f of flags) gs.setFlag(f);
      const m0 = gs.getState().stats.money;
      const economy = ec.applyStageEconomy('career');
      const moneyDelta = gs.getState().stats.money - m0;
      if (moneyDelta !== economy.net) throw new Error('经济落账不一致：' + moneyDelta + ' !== ' + economy.net);
      return moneyDelta;
    };
    const top = incomeOf(['offer_sanjia']);
    const city = incomeOf([]);
    const county = incomeOf(['offer_grass']);
    const priv = incomeOf(['took_private']);
    // 房价档位
    const houseOf = (flags: string[]) => {
      gs.resetGame();
      for (const f of flags) gs.setFlag(f);
      return { down: ec.houseDownPayment(), monthly: ec.houseMonthly(), label: ec.REGION_LABEL[ec.currentRegionTier()] };
    };
    return {
      income: { top, city, county, priv },
      house: { top: houseOf(['offer_sanjia']), county: houseOf(['offer_grass']), city: houseOf([]) },
      currentTier: houseOf([]).label,
    };
  });
  console.log('  地区收入(同职称声望):', JSON.stringify(r.income));
  console.log('  房价档位:', JSON.stringify(r.house));
  expect(r.income.top, '三甲收入应最高').toBeGreaterThan(r.income.city);
  expect(r.income.city, '市级收入应高于基层').toBeGreaterThan(r.income.county);
  expect(r.income.priv, '私立收入应高于基层').toBeGreaterThan(r.income.county);
  expect(r.house.top.down, '三甲首付应最贵').toBeGreaterThan(r.house.county.down);
  expect(r.house.top.monthly, '三甲月供应最高').toBeGreaterThan(r.house.county.monthly);
  expect(r.house.city.down, '市级首付介于两者之间').toBeGreaterThan(r.house.county.down);
});
