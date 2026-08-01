import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 经济系统回归：
// 1) 随机家庭条件决定上学期间父母补贴（rich > middle > tight）；
// 2) 理财策略每季自动应用（节流 > 稳健 > 投资波动）；
// 3) 职业阶段收入含职称档差与绩效，支出含房贷。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('家庭条件影响上学期间父母补贴', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    const netOf = (wealth: string) => {
      gs.resetGame();
      gs.patchState({ familyWealth: wealth, financeStrategy: 'stable' });
      const m = gs.getState().stats.money;
      tf.advanceQuarter('undergrad');
      return gs.getState().stats.money - m;
    };
    return { rich: netOf('rich'), middle: netOf('middle'), tight: netOf('tight') };
  });
  console.log('  家庭补贴净结余:', JSON.stringify(r));
  expect(r.rich, '富裕家庭净结余应更高').toBeGreaterThan(r.middle);
  expect(r.middle, '普通家庭净结余应高于拮据').toBeGreaterThan(r.tight);
});

test('理财策略每季自动应用（节流/稳健/投资）', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    const netOf = (strategy: string) => {
      gs.resetGame();
      gs.patchState({ familyWealth: 'middle', financeStrategy: strategy });
      const m = gs.getState().stats.money;
      const econ = tf.advanceQuarter('undergrad');
      const delta = gs.getState().stats.money - m;
      return { delta, note: econ.econ?.financeNote ?? '' };
    };
    return { thrifty: netOf('thrifty'), stable: netOf('stable'), invest: netOf('invest') };
  });
  console.log('  理财策略净结余:', JSON.stringify(r));
  expect(r.thrifty.delta, '节流净结余应高于稳健').toBeGreaterThan(r.stable.delta);
  expect(r.thrifty.note.includes('节流'), '节流应有注记').toBe(true);
  // 投资：净结余在 -800 附近 ±15% 波动（不精确断言，只确认方向未失控）
  expect(Math.abs(r.invest.delta - r.stable.delta), '投资波动应有限').toBeLessThanOrEqual(Math.abs(r.stable.delta) * 0.15 + 1);
});

test('职业阶段收入含职称档差与绩效、支出含房贷', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    const netOf = (setup: () => void) => {
      gs.resetGame();
      gs.patchState({ stage: 'career', familyWealth: 'middle', financeStrategy: 'stable' });
      setup();
      const m = gs.getState().stats.money;
      tf.advanceQuarter('career');
      return gs.getState().stats.money - m;
    };
    const base = netOf(() => {});
    const fugao = netOf(() => { gs.setFlag('passed_fugao'); gs.setFlag('bought_house'); });
    return { base, fugao };
  });
  console.log('  职业净结余(底薪/副高+房贷):', JSON.stringify(r));
  // 底薪(rep10): 30000+500-16000 = 14500；副高+房贷: 30000+8000+500-18500 = 20000
  expect(r.base, '职业底薪净结余').toBe(14500);
  expect(r.fugao, '副高档差+房贷后的净结余').toBe(20000);
});

test('R 菜单可调整理财策略并持久化', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'TitleScene'),
    null, { timeout: 60000 },
  );
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'GaokaoScene'),
    null, { timeout: 60000 },
  );
  for (let i = 0; i < 7; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'CampusScene'),
    null, { timeout: 60000 },
  );
  await page.keyboard.press('Enter'); // 关简报
  await page.waitForTimeout(400);

  // R → 理财策略（第 4 项）→ 当前"稳健"（第 2 项）→ ↑ 到"节流" → 回车
  await page.keyboard.press('r');
  await page.waitForTimeout(400);
  await page.keyboard.press('4');
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    const raw = localStorage.getItem('fckmedcn_save_v1');
    return {
      strategy: gs.getState().financeStrategy,
      saved: raw ? JSON.parse(raw).state.financeStrategy : null,
    };
  });
  expect(state.strategy, 'R 菜单应把策略改为 thrifty').toBe('thrifty');
  expect(state.saved, '存档应同步 thrifty').toBe('thrifty');
});

test('助学贷款：上学补贴、工作后还贷', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    const net = (familyWealth: string, loan: boolean, stage: string) => {
      gs.resetGame();
      gs.patchState({
        familyWealth, financeStrategy: 'stable',
        flags: loan ? new Set(['student_loan']) : new Set(),
      });
      const m = gs.getState().stats.money;
      tf.advanceQuarter(stage);
      return gs.getState().stats.money - m;
    };
    return {
      tightNoLoan: net('tight', false, 'undergrad'), // 1800-3800 = -2000
      tightLoan: net('tight', true, 'undergrad'),    // 3300-3800 = -500
      careerNoLoan: net('middle', false, 'career'),  // 30500-16000 = 14500
      careerLoan: net('middle', true, 'career'),     // 30500-17500 = 13000
    };
  });
  console.log('  助学贷款:', JSON.stringify(r));
  expect(r.tightLoan, '贷款应显著改善拮据本科净结余').toBe(r.tightNoLoan + 1500);
  expect(r.careerLoan, '工作后应还贷 1500/季').toBe(r.careerNoLoan - 1500);
});
