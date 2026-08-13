import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { advanceByEnterUntilScene } from './helpers';

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
      const a = gs.getState().assets;
      const econ = tf.advanceQuarter('undergrad');
      // 节流会把结余转进储蓄账户，故"净结余"看总财富（现金 + 资产）变动，不只现金。
      const cash = gs.getState().stats.money - m;
      const wealth = cash + (gs.getState().assets - a);
      return { cash, wealth, note: econ.econ?.financeNote ?? '' };
    };
    return { thrifty: netOf('thrifty'), stable: netOf('stable'), invest: netOf('invest') };
  });
  console.log('  理财策略净结余(总财富):', JSON.stringify(r));
  expect(r.thrifty.wealth, '节流总财富净结余应高于稳健').toBeGreaterThan(r.stable.wealth);
  expect(r.thrifty.note.includes('节流'), '节流应有注记').toBe(true);
  // 投资：总财富与稳健的偏差应有限（≤15%）
  expect(Math.abs(r.invest.wealth - r.stable.wealth), '投资波动应有限').toBeLessThanOrEqual(Math.abs(r.stable.wealth) * 0.15 + 1);
});

test('职业阶段收入含职称档差与绩效、支出含房贷', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ec } = (window as any).__mod;
    const netOf = (setup: () => void) => {
      gs.resetGame();
      gs.patchState({ stage: 'career', familyWealth: 'middle', financeStrategy: 'stable' });
      setup();
      return ec.getQuarterEconomy('career').net;
    };
    const base = netOf(() => {});
    const fugao = netOf(() => { gs.setFlag('passed_fugao'); gs.setFlag('bought_house'); });
    return { base, fugao };
  });
  console.log('  职业净结余(底薪/副高+房贷):', JSON.stringify(r));
  // 直接断言纯经济盘口，避免 advanceQuarter 的健康/政策/life-system tick 污染此测试。
  // 默认市级档位（REGION_INCOME=1.1），默认政策盈余给绩效部分 4% 加成；
  // 另含公积金个人缴存（无编制 flag 时默认 7%）与养老金个人缴存（8%）。
  expect(r.base, '职业底薪净结余').toBe(13145);
  expect(r.fugao, '副高档差+房贷后的净结余').toBe(17789);
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
  await advanceByEnterUntilScene(page, 'CampusScene');
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'CampusScene'),
    null, { timeout: 60000 },
  );
  await page.keyboard.press('Enter'); // 关简报
  await page.waitForTimeout(400);

  const stableCost = await page.evaluate(() => {
    const { ec } = (window as any).__mod;
    return ec.getQuarterEconomy('undergrad').cost;
  });

  // R → 理财策略（第 4 项）→ 当前"稳健"（第 2 项）→ ↑ 到"节流" → 回车
  await page.keyboard.press('r');
  await page.waitForTimeout(400);
  await page.keyboard.press('4');
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const { gs, ec } = (window as any).__mod;
    const raw = localStorage.getItem('fckmedcn_save_v1');
    const scene = (window as any).game.scene.getScene('CampusScene') as any;
    return {
      strategy: gs.getState().financeStrategy,
      saved: raw ? JSON.parse(raw).state.financeStrategy : null,
      expectedCost: ec.getQuarterEconomy('undergrad').cost,
      displayedFinance: scene.hud?.attrsLabel?.text ?? '',
    };
  });
  expect(state.strategy, 'R 菜单应把策略改为 thrifty').toBe('thrifty');
  expect(state.saved, '存档应同步 thrifty').toBe('thrifty');
  expect(state.expectedCost, '节流策略应立即降低本季支出').toBeLessThan(stableCost);
  expect(state.displayedFinance, '修改策略后 HUD 应立即刷新').toContain('理财:节流');
});

test('R 菜单资产账户可应急提现并持久化流水', async ({ page }) => {
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
  await advanceByEnterUntilScene(page, 'CampusScene');
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'CampusScene'),
    null, { timeout: 60000 },
  );
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.patchState({ assets: 6000, assetLedger: [], stats: { ...gs.getState().stats, money: 5000 } });
  });

  await page.keyboard.press('r');
  await page.waitForTimeout(250);
  await page.keyboard.press('5');
  await page.waitForTimeout(250);
  await page.keyboard.press('1');
  await page.waitForTimeout(350);

  const result = await page.evaluate(() => {
    const state = (window as any).__mod.gs.getState();
    const raw = localStorage.getItem('fckmedcn_save_v1');
    const saved = raw ? JSON.parse(raw).state : null;
    return {
      assets: state.assets,
      money: state.stats.money,
      kind: state.assetLedger.at(-1)?.kind,
      savedAssets: saved?.assets,
      savedKind: saved?.assetLedger?.at(-1)?.kind,
    };
  });
  expect(result.assets).toBe(1000);
  expect(result.money, '提现 ¥5,000 扣 2% 后现金应增加 ¥4,900').toBe(9900);
  expect(result.kind).toBe('withdrawal');
  expect(result.savedAssets).toBe(1000);
  expect(result.savedKind).toBe('withdrawal');
});

test('助学贷款：上学补贴、工作后还贷', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ec } = (window as any).__mod;
    const net = (familyWealth: string, loan: boolean, stage: string) => {
      gs.resetGame();
      gs.patchState({
        familyWealth, financeStrategy: 'stable',
        flags: loan ? new Set(['student_loan']) : new Set(),
      });
      const m = gs.getState().stats.money;
      // 这里只验证贷款对固定经济结算的影响。完整 advanceQuarter 还会随机触发
      // 患者安全赔付（重大事故恰为 -15000），会把无关随机性混入贷款断言。
      const economy = ec.applyStageEconomy(stage);
      const moneyDelta = gs.getState().stats.money - m;
      if (moneyDelta !== economy.net) throw new Error(`经济落账不一致：${moneyDelta} !== ${economy.net}`);
      return moneyDelta;
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

test('资产账户：节流转储蓄计息、投资投入波动', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    const run = (strategy: string) => {
      gs.resetGame();
      gs.patchState({
        stage: 'career', familyWealth: 'middle', financeStrategy: strategy,
        attrs: { family: 2, academic: 3, luck: 2, looks: 3 },
      });
      const m = gs.getState().stats.money;
      const econ = tf.advanceQuarter('career');
      return {
        moneyDelta: gs.getState().stats.money - m,
        assets: gs.getState().assets,
        note: econ.econ?.financeNote ?? '',
      };
    };
    return { thrifty: run('thrifty'), invest: run('invest') };
  });
  console.log('  资产账户(节流/投资):', JSON.stringify(r));
  // 节流：净 16100 → 转储蓄 30%（4830）+ 利息 24 → 现金 11270，资产 4854
  expect(r.thrifty.assets, '节流应累积储蓄').toBeGreaterThan(0);
  expect(r.thrifty.moneyDelta, '节流现金应低于投入前').toBeLessThan(14500);
  expect(r.thrifty.note.includes('转储蓄'), '节流注记应含转储蓄').toBe(true);
  // 投资：净 14500 → 投入 50%（7250）→ 现金 7250，资产 7250±8%
  expect(r.invest.assets, '投资应累积本金').toBeGreaterThan(0);
  expect(r.invest.moneyDelta, '投资现金应低于投入前').toBeLessThan(14500);
  expect(r.invest.note.includes('投入'), '投资注记应含投入').toBe(true);
});

test('资产操作：提现扣明确手续费、首付优先抵扣资产且总财富守恒', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ec, ev, tf } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({
      stage: 'career', assets: 12000, assetLedger: [],
      stats: { ...gs.getState().stats, money: 20000 },
      flags: new Set(['offer_sanjia']),
    });
    const beforeWithdraw = gs.getState().stats.money + gs.getState().assets;
    const withdrawal = ec.withdrawAssets(20000);
    const afterWithdraw = gs.getState().stats.money + gs.getState().assets;

    const house = ev.ALL_EVENTS.find((event: any) => event.id === 'career_mid_house');
    const beforeHouse = gs.getState().stats.money + gs.getState().assets;
    tf.commitChoice(house.choices[0], house);
    const state = gs.getState();
    const afterHouse = state.stats.money + state.assets;
    return {
      withdrawal, beforeWithdraw, afterWithdraw,
      beforeHouse, afterHouse,
      houseDown: ec.houseDownPayment(),
      bought: state.flags.has('bought_house'),
      assets: state.assets,
      ledger: state.assetLedger,
    };
  });

  expect(r.withdrawal.withdrawn, '单次提现应受 ¥10,000 上限约束').toBe(10000);
  expect(r.withdrawal.fee, '提现应收 2% 手续费').toBe(200);
  expect(r.afterWithdraw, '提现前后总财富只减少手续费').toBe(r.beforeWithdraw - r.withdrawal.fee);
  expect(r.bought, '购房副作用应设置 bought_house').toBe(true);
  expect(r.assets, '首付应优先耗尽剩余资产').toBe(0);
  expect(r.afterHouse, '购房后现金+资产应恰好减少地区首付').toBe(r.beforeHouse - r.houseDown);
  expect(r.ledger.map((entry: any) => entry.kind)).toEqual(['withdrawal', 'house']);
});

test('资产用途：教育基金和提前还贷产生后续季度收益', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ec } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({
      stage: 'career', assets: 20000, assetLedger: [], hasChild: true,
      stats: { ...gs.getState().stats, money: 20000 },
      flags: new Set(['offer_sanjia', 'bought_house']),
    });
    const childCostBefore = ec.childQuarterCost();
    const mortgageBefore = ec.houseMonthly();
    const wealthBefore = gs.getState().stats.money + gs.getState().assets;
    const education = ec.fundChildEducation();
    const mortgage = ec.prepayMortgage();
    const state = gs.getState();
    return {
      education, mortgage,
      wealthBefore,
      wealthAfter: state.stats.money + state.assets,
      childCostBefore,
      childCostAfter: ec.childQuarterCost(),
      mortgageBefore,
      mortgageAfter: ec.houseMonthly(),
      ledgerKinds: state.assetLedger.map((entry: any) => entry.kind),
      educationAgain: ec.fundChildEducation(),
      mortgageAgain: ec.prepayMortgage(),
    };
  });

  expect(r.education?.amount).toBe(5000);
  expect(r.childCostAfter, '教育基金应降低后续季度育儿支出').toBe(r.childCostBefore - 400);
  expect(r.mortgageAfter, '提前还贷应降低后续季度房贷').toBe(Math.round(r.mortgageBefore * 0.6));
  expect(r.wealthAfter, '两项用途应各按明确金额减少总财富')
    .toBe(r.wealthBefore - r.education.amount - r.mortgage.amount);
  expect(r.ledgerKinds).toEqual(['education', 'mortgage']);
  expect(r.educationAgain, '教育基金不能重复扣款').toBeNull();
  expect(r.mortgageAgain, '提前还贷不能重复扣款').toBeNull();
});

test('结局财务卡：按地区/职称拆分现金、资产、房贷和可支配收入', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ec } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({
      stage: 'career', assets: 12000, mortgageBalance: 64000,
      stats: { ...gs.getState().stats, money: 30000, reputation: 50 },
      flags: new Set(['offer_sanjia', 'passed_fugao', 'bought_house']),
    });
    return ec.careerFinancialSnapshot();
  });
  expect(r.region).toBe('一线三甲');
  expect(r.title).toBe('副主任医师');
  expect(r.cash).toBe(30000);
  expect(r.assets).toBe(12000);
  expect(r.mortgageBalance).toBe(64000);
  expect(r.housePayment).toBe(5000);
  expect(r.disposable).toBe(r.quarterlyIncome - r.quarterlyCost);
});
