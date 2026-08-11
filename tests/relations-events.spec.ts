import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 属性差异化回归：
// 1) relations 门槛事件由"外貌→起始人际"解锁（高人际在池、低人际不在池）；
// 2) 硕博导师绩效风格随机影响补助收入；
// 3) 职业赔付/扣罚按职级差异化（住院医轻、主任重）。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('relations 门槛事件随人际高低可用性不同', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ev, stats: st } = (window as any).__mod;
    const base = st.createDefaultStats();
    const CASES: Array<[string, string, number]> = [
      ['ug_class_rep', 'undergrad', 60],
      ['in_teacher_favors', 'internship', 55],
      ['gp_nurse_ally', 'guipei', 55],
      ['ms_senior_network', 'master', 55],
      ['career_patient_follow', 'career', 60],
      ['career_leader_pick', 'career', 65],
    ];
    const inPool = (id: string, stage: string, relations: number, turn: number) => {
      gs.resetGame();
      gs.patchState({ stats: { ...base, relations }, turnsInStage: turn });
      const pool = ev.getAvailableEvents(stage, new Set(), gs.getState().stats, new Set(), turn, 'single');
      return pool.some((e: any) => e.id === id);
    };
    return CASES.map(([id, stage, threshold]) => ({
      id, threshold,
      high: inPool(id, stage, 70, 8),   // 外貌5 → 人际70
      low: inPool(id, stage, 50, 8),    // 外貌0 → 人际50
    }));
  });
  for (const x of r) {
    console.log(`  ${x.high && !x.low ? '✓' : '✗'} ${x.id}（门槛人际${x.threshold}）：高人际${x.high} 低人际${x.low}`);
    expect(x.high, `${x.id} 高人际应解锁`).toBe(true);
    expect(x.low, `${x.id} 低人际（50）不应解锁`).toBe(false);
  }
});

test('硕博导师绩效风格随机影响补助收入', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ec } = (window as any).__mod;
    const originalRandom = Math.random;
    Math.random = () => 0.5;
    const netOf = (style: string, stage: string) => {
      gs.resetGame();
      gs.patchState({ mentorStyle: style, financeStrategy: 'stable', familyWealth: 'middle' });
      return ec.getQuarterEconomy(stage).net;
    };
    const result = {
      generous: netOf('generous', 'master'), // 3600×1.25×(0.9~1.1) - 2800
      tight: netOf('tight', 'master'),       // 3600×0.5×(0.9~1.1) - 2800
      pyramid: netOf('pyramid', 'phd'),      // 4600×0.65×(0.9~1.1) - 3000
    };
    Math.random = originalRandom;
    return result;
  });
  console.log('  导师风格净结余:', JSON.stringify(r));
  expect(r.generous, '慷慨导师应明显高于抠门导师').toBeGreaterThan(r.tight + 1000);
  expect(r.pyramid, '金字塔式应高于抠门、低于平均').toBeGreaterThan(-1200);
});

test('职业赔付/扣罚按职级差异化', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf, ev } = (window as any).__mod;
    const e = ev.ALL_EVENTS.find((x: any) => x.id === 'career_fin_record_fine');
    const choice = e.choices[0]; // 连夜整改 -800
    const applyMoney = (flags: string[]) => {
      gs.resetGame();
      gs.patchState({ stage: 'career', financeStrategy: 'stable', flags: new Set(flags) });
      const m = gs.getState().stats.money;
      tf.commitChoice(choice, e);
      return m - gs.getState().stats.money; // 损失为正数
    };
    return {
      resident: applyMoney([]),        // 无职级 → ×0.7
      attending: applyMoney(['passed_zhuzhi']), // ×1.0
      chief: applyMoney(['passed_zhenggao']),   // ×1.5
    };
  });
  console.log('  扣费损失(住院医/主治/主任):', JSON.stringify(r));
  expect(r.resident, '住院医损失应最轻（×0.7 → 560）').toBe(560);
  expect(r.attending, '主治损失为基准（800）').toBe(800);
  expect(r.chief, '主任损失应最重（×1.5 → 1200）').toBe(1200);
});
