import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 职业路线事件池分化 + 编制/公积金薄系统：
// 1) 求职 region / 雇佣 flag 决定 career 可抽事件；
// 2) 公积金按编制/合同差异缴存并入资产；
// 3) took_public 明确落在市级档。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('求职路线 flag 门控职业专属事件', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ev } = (window as any).__mod;
    const available = (flags: string[], stamina = 80) => {
      gs.resetGame();
      gs.patchState({
        stage: 'career',
        stats: { ...gs.getState().stats, stamina, reputation: 40, knowledge: 50, clinical: 40 },
      });
      for (const f of flags) gs.setFlag(f);
      const ids = ev.getAvailableEvents(
        'career',
        gs.getState().flags,
        gs.getState().stats,
        new Set(),
        4,
        'single',
      ).map((e: { id: string }) => e.id);
      return {
        sanjia: ids.includes('career_route_sanjia_hardcase'),
        grass: ids.includes('career_route_grass_generalism'),
        priv: ids.includes('career_route_private_kpi'),
        pub: ids.includes('career_route_public_quota'),
        bianzhi: ids.includes('career_emp_bianzhi_stable'),
        contract: ids.includes('career_emp_contract_renewal'),
        sick: ids.includes('career_sick_leave_request'),
      };
    };
    return {
      none: available([]),
      sanjia: available(['offer_sanjia']),
      grass: available(['offer_grass']),
      priv: available(['took_private']),
      pub: available(['took_public']),
      emp: available(['jh_bianzhi_in']),
      contract: available(['contract']),
      lowStamina: available(['offer_sanjia'], 30),
    };
  });

  expect(r.none.sanjia).toBe(false);
  expect(r.none.grass).toBe(false);
  expect(r.none.priv).toBe(false);
  expect(r.sanjia.sanjia).toBe(true);
  expect(r.sanjia.grass).toBe(false);
  expect(r.grass.grass).toBe(true);
  expect(r.grass.sanjia).toBe(false);
  expect(r.priv.priv).toBe(true);
  expect(r.pub.pub).toBe(true);
  expect(r.emp.bianzhi).toBe(true);
  expect(r.emp.contract).toBe(false);
  expect(r.contract.contract).toBe(true);
  expect(r.lowStamina.sick).toBe(true);
  expect(r.sanjia.sick).toBe(false);
});

test('公积金与编制/合同差异影响职业季度结算', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ec } = (window as any).__mod;
    const run = (flags: string[]) => {
      gs.resetGame();
      gs.patchState({
        stage: 'career',
        familyWealth: 'middle',
        financeStrategy: 'stable',
        assets: 0,
        stats: { ...gs.getState().stats, reputation: 50, money: 0 },
      });
      for (const f of flags) gs.setFlag(f);
      const beforeAssets = gs.getState().assets;
      const economy = ec.applyStageEconomy('career');
      const rates = ec.housingFundRates();
      const fund = ec.housingFundForIncome(economy.income);
      return {
        income: economy.income,
        cost: economy.cost,
        net: economy.net,
        assetDelta: gs.getState().assets - beforeAssets,
        fundDeposit: fund.deposit,
        employeeRate: rates.employeeRate,
        tier: ec.currentRegionTier(),
        note: economy.financeNote,
      };
    };
    return {
      default: run([]),
      bianzhi: run(['jh_bianzhi_in', 'offer_sanjia']),
      contract: run(['contract', 'offer_sanjia']),
      publicTier: run(['took_public']),
    };
  });

  expect(r.publicTier.tier).toBe('city');
  expect(r.bianzhi.employeeRate).toBeGreaterThan(r.contract.employeeRate);
  expect(r.bianzhi.fundDeposit).toBeGreaterThan(r.contract.fundDeposit);
  expect(r.bianzhi.assetDelta).toBe(r.bianzhi.fundDeposit);
  expect(r.contract.assetDelta).toBe(r.contract.fundDeposit);
  expect(r.default.assetDelta).toBeGreaterThan(0);
  expect(r.bianzhi.note).toContain('公积金');
  // 同地区下合同制现金毛收入略高于编制
  expect(r.contract.income).toBeGreaterThan(r.bianzhi.income);
});
