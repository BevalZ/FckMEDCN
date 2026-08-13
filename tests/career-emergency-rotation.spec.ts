import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 急诊第五亚专科 + 薄轮转：
// 1) 选科写入 sub_emergency；诉讼/初期压力门控；
// 2) 体/心双轨全速累积；
// 3) 非急诊第 6 季强制急诊轮转；急诊强制病房支援；active 只吃一季。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('急诊亚专科：诉讼可达、初期压力门控、双轨累积', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf, ev, stats: st, specialtyLoad: sl } = (window as any).__mod;
    Math.random = () => 0.999999;
    const base = st.createDefaultStats();

    const choice = ev.ALL_EVENTS.find((e: any) => e.id === 'career_specialty_choice');
    const hasErChoice = (choice?.choices ?? []).some((c: any) => c.flagSet === 'sub_emergency');

    const lawsuit1 = ev.getAvailableEvents('career', new Set(['sub_emergency']), { ...base }, new Set(), 3, 'single')
      .find((e: any) => e.id === 'career_lawsuit_1_emergency');
    const lawsuitCross = ev.getAvailableEvents('career', new Set(['sub_surgery']), { ...base }, new Set(), 3, 'single')
      .some((e: any) => e.id === 'career_lawsuit_1_emergency');
    const early = ev.getAvailableEvents('career', new Set(['sub_emergency']), { ...base }, new Set(), 3, 'single')
      .some((e: any) => e.id === 'career_early_emergency_pressure');

    gs.resetGame();
    gs.patchState({
      stage: 'career', turnsInStage: 0,
      stats: { ...base, stamina: 90 },
    });
    gs.setFlag('sub_emergency');
    for (let t = 0; t < 10; t++) {
      gs.patchState({ turnsInStage: t });
      tf.advanceQuarter('career');
    }
    return {
      hasErChoice,
      lawsuitOwn: !!lawsuit1,
      lawsuitCross,
      early,
      wear: gs.getCounter(sl.SURG_WEAR_KEY),
      floor: sl.sanityCrisisFloor(),
      drainSanity: (() => {
        gs.resetGame();
        gs.patchState({ stage: 'career', turnsInStage: 0, stats: { ...st.createDefaultStats(), sanity: 85 } });
        gs.setFlag('sub_emergency');
        tf.advanceQuarter('career');
        return 85 - gs.getState().stats.sanity;
      })(),
    };
  });

  expect(r.hasErChoice, '选科应含急诊').toBe(true);
  expect(r.lawsuitOwn, '急诊诉讼本专科可达').toBe(true);
  expect(r.lawsuitCross, '急诊诉讼不应串科').toBe(false);
  expect(r.early, '急诊初期压力可达').toBe(true);
  // 10 季全速：wear≥10（疲劳加速时更多）、floor=10
  expect(r.wear).toBeGreaterThanOrEqual(10);
  expect(r.floor).toBe(10);
  // heal +2 / drain -4 → 净 -2（其它系统可能再扣，至少 ≥2）
  expect(r.drainSanity).toBeGreaterThanOrEqual(2);
});

test('薄轮转：非急诊强制急诊轮转，急诊强制病房支援，active 一季清除', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf, ev, stats: st, specialtyLoad: sl } = (window as any).__mod;
    Math.random = () => 0.999999;

    const erEv = ev.ALL_EVENTS.find((e: any) => e.id === 'career_er_rotation');
    const wardEv = ev.ALL_EVENTS.find((e: any) => e.id === 'career_ward_rotation');

    // 非急诊：commit 急诊轮转 → active → 结算一季后清除，done 保留，wear/floor +1
    gs.resetGame();
    gs.patchState({ stage: 'career', turnsInStage: 6, stats: st.createDefaultStats() });
    gs.setFlag('sub_internal');
    const beforeWear = gs.getCounter(sl.SURG_WEAR_KEY);
    const beforeFloor = sl.sanityCrisisFloor();
    tf.commitChoice(erEv.choices[0], erEv);
    const afterChoice = {
      done: gs.getState().flags.has('er_rotation_done'),
      active: gs.getState().flags.has('er_rotation_active'),
    };
    tf.advanceQuarter('career');
    const afterQuarter = {
      active: gs.getState().flags.has('er_rotation_active'),
      done: gs.getState().flags.has('er_rotation_done'),
      wearDelta: gs.getCounter(sl.SURG_WEAR_KEY) - beforeWear,
      floorDelta: sl.sanityCrisisFloor() - beforeFloor,
    };

    // 急诊：病房支援 → 当季不叠急诊全速累积（wear/floor 不因急诊轨上升）
    gs.resetGame();
    gs.patchState({
      stage: 'career', turnsInStage: 6,
      stats: { ...st.createDefaultStats(), stamina: 90 },
    });
    gs.setFlag('sub_emergency');
    tf.commitChoice(wardEv.choices[0], wardEv);
    const wardActive = gs.getState().flags.has('ward_rotation_active');
    tf.advanceQuarter('career');
    const wardAfter = {
      active: gs.getState().flags.has('ward_rotation_active'),
      done: gs.getState().flags.has('ward_rotation_done'),
      wear: gs.getCounter(sl.SURG_WEAR_KEY),
      floor: sl.sanityCrisisFloor(),
    };

    return {
      erManual: erEv?.manualOnly === true,
      wardManual: wardEv?.manualOnly === true,
      wardRequiresEr: wardEv?.requireFlag === 'sub_emergency',
      afterChoice,
      afterQuarter,
      wardActive,
      wardAfter,
    };
  });

  expect(r.erManual).toBe(true);
  expect(r.wardManual).toBe(true);
  expect(r.wardRequiresEr).toBe(true);
  expect(r.afterChoice.done).toBe(true);
  expect(r.afterChoice.active).toBe(true);
  expect(r.afterQuarter.active, '急诊轮转 active 应一季后清除').toBe(false);
  expect(r.afterQuarter.done).toBe(true);
  expect(r.afterQuarter.wearDelta).toBe(1);
  expect(r.afterQuarter.floorDelta).toBe(1);
  expect(r.wardActive).toBe(true);
  expect(r.wardAfter.active).toBe(false);
  expect(r.wardAfter.done).toBe(true);
  expect(r.wardAfter.wear, '病房支援当季应暂停急诊体限累积').toBe(0);
  expect(r.wardAfter.floor, '病房支援当季应暂停急诊危阈累积').toBe(0);
});

test('CareerScene 第6季强制轮转节点', async ({ page }) => {
  await boot(page);
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'TitleScene'),
    null, { timeout: 60000 },
  );
  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'career', turnsInStage: 6 });
    gs.setFlag('sub_surgery');
    gs.setFlag('lawsuit_done_1');
    gs.setFlag('appraisal_resolved');
    gs.setFlag('chief_offer_resolved');
    (window as any).game.scene.getScene('TitleScene').scene.start('CareerScene');
  });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'CareerScene'),
    null, { timeout: 60000 },
  );
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  await page.waitForFunction(
    () => {
      const s: any = (window as any).game.scene.getScene('CareerScene');
      return s.currentEvent?.id === 'career_er_rotation';
    },
    null, { timeout: 20000 },
  );
  const id = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CareerScene');
    return s.currentEvent?.id ?? null;
  });
  expect(id).toBe('career_er_rotation');
});
