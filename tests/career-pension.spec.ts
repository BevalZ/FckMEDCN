import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 养老金独立账户：编制雇主更高、不进资产、退休领取可见。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('编制养老金缴存高于合同，且不并入资产', async ({ page }) => {
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
        pension: 0,
        stats: { ...gs.getState().stats, reputation: 50, money: 0 },
      });
      for (const f of flags) gs.setFlag(f);
      const beforeAssets = gs.getState().assets;
      const beforePension = gs.getState().pension;
      const economy = ec.applyStageEconomy('career');
      const rates = ec.pensionRates();
      const pen = ec.pensionForIncome(economy.income);
      return {
        income: economy.income,
        cost: economy.cost,
        assetDelta: gs.getState().assets - beforeAssets,
        pensionDelta: gs.getState().pension - beforePension,
        deposit: pen.deposit,
        employeeRate: rates.employeeRate,
        employerRate: rates.employerRate,
        note: economy.financeNote,
        housingDeposit: ec.housingFundForIncome(economy.income).deposit,
      };
    };
    return {
      bianzhi: run(['jh_bianzhi_in', 'offer_sanjia']),
      contract: run(['contract', 'offer_sanjia']),
    };
  });

  expect(r.bianzhi.employerRate).toBeGreaterThan(r.contract.employerRate);
  expect(r.bianzhi.deposit).toBeGreaterThan(r.contract.deposit);
  expect(r.bianzhi.pensionDelta).toBe(r.bianzhi.deposit);
  expect(r.contract.pensionDelta).toBe(r.contract.deposit);
  // 资产只进公积金，不进养老金
  expect(r.bianzhi.assetDelta).toBe(r.bianzhi.housingDeposit);
  expect(r.contract.assetDelta).toBe(r.contract.housingDeposit);
  expect(r.bianzhi.note).toContain('养老金');
  expect(r.contract.note).toContain('养老金');
});

test('节流计息不侵蚀养老金账户；退休期按余额领取', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ec } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({
      stage: 'career',
      familyWealth: 'middle',
      financeStrategy: 'thrifty',
      assets: 10000,
      pension: 40000,
      stats: { ...gs.getState().stats, reputation: 40, money: 0 },
    });
    gs.setFlag('jh_bianzhi_in');
    gs.setFlag('offer_sanjia');
    const pensionBefore = gs.getState().pension;
    const econCareer = ec.applyStageEconomy('career');
    const pensionAfterCareer = gs.getState().pension;
    const deposit = ec.pensionForIncome(econCareer.income).deposit;

    gs.patchState({ stage: 'retirement', financeStrategy: 'stable' });
    const payout = ec.pensionQuarterlyPayout(pensionAfterCareer);
    const retire = ec.getQuarterEconomy('retirement');
    const snapshot = ec.careerFinancialSnapshot();
    gs.patchState({ pension: 0 });
    const retireBase = ec.getQuarterEconomy('retirement').income;

    return {
      note: econCareer.financeNote,
      pensionGrewBy: pensionAfterCareer - pensionBefore,
      deposit,
      assets: gs.getState().assets,
      payout,
      retireIncome: retire.income,
      retireBase,
      snapshot,
    };
  });

  expect(r.pensionGrewBy).toBe(r.deposit);
  expect(r.note).toContain('养老金');
  expect(r.payout).toBeGreaterThan(0);
  expect(r.retireIncome).toBe(r.retireBase + r.payout);
  expect(r.snapshot.pension).toBeGreaterThan(40000);
  expect(r.snapshot.pensionPayout).toBe(r.payout);
});
