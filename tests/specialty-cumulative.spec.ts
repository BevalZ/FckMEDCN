import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 亚专科累积效应：外科体力上限下降；儿科危机阈值上升；内科不累积。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('外科累积降低体力上限，回血无法越过上限', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf, stats: st, specialtyLoad: sl } = (window as any).__mod;
    Math.random = () => 0.999999;
    gs.resetGame();
    gs.patchState({
      stage: 'career', turnsInStage: 0,
      stats: { ...st.createDefaultStats(), stamina: 90 },
    });
    gs.setFlag('sub_surgery');
    const caps: number[] = [];
    const notes: string[] = [];
    for (let t = 0; t < 12; t++) {
      gs.patchState({ turnsInStage: t });
      const out = tf.advanceQuarter('career');
      if (out.specialtyNote) notes.push(out.specialtyNote);
      caps.push(sl.staminaCap());
    }
    // 强行抬高体力应被上限夹住
    const cap = sl.staminaCap();
    gs.patchState({ stats: { ...gs.getState().stats, stamina: 99 } });
    sl.enforceStaminaCap();
    const afterClamp = gs.getState().stats.stamina;
    const wear = gs.getCounter(sl.SURG_WEAR_KEY);
    return {
      wear,
      finalCap: cap,
      afterClamp,
      capsFirst: caps[0],
      capsLast: caps[caps.length - 1],
      milestoneNote: notes.some((n: string) => n.includes('体力上限')),
    };
  });

  expect(r.wear).toBeGreaterThanOrEqual(12);
  expect(r.finalCap).toBe(100 - r.wear);
  expect(r.capsLast).toBeLessThan(r.capsFirst);
  expect(r.afterClamp).toBe(r.finalCap);
  expect(r.milestoneNote).toBe(true);
});

test('儿科累积抬升危机阈值；内科不累积', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf, stats: st, specialtyLoad: sl } = (window as any).__mod;
    Math.random = () => 0.999999;

    const run = (flag: string) => {
      gs.resetGame();
      gs.patchState({ stage: 'career', turnsInStage: 0, stats: st.createDefaultStats() });
      gs.setFlag(flag);
      for (let t = 0; t < 10; t++) {
        gs.patchState({ turnsInStage: t });
        tf.advanceQuarter('career');
      }
      return {
        floor: sl.sanityCrisisFloor(),
        wear: gs.getCounter(sl.SURG_WEAR_KEY),
        crisisAtLow: (() => {
          gs.patchState({ stats: { ...gs.getState().stats, sanity: 8 } });
          return sl.isInMentalCrisis();
        })(),
        crisisAtHigh: (() => {
          gs.patchState({ stats: { ...gs.getState().stats, sanity: 12 } });
          return sl.isInMentalCrisis();
        })(),
      };
    };

    return { peds: run('sub_pediatrics'), internal: run('sub_internal') };
  });

  expect(r.peds.floor).toBe(10);
  expect(r.peds.crisisAtLow).toBe(true);
  expect(r.peds.crisisAtHigh).toBe(false);
  expect(r.internal.floor).toBe(0);
  expect(r.internal.wear).toBe(0);
  expect(r.internal.crisisAtLow).toBe(false);
});

test('妇产科轻累积：体/心双轨半速，慢于外/儿专轨', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf, stats: st, specialtyLoad: sl } = (window as any).__mod;
    Math.random = () => 0.999999;

    const run = (flag: string, turns = 10) => {
      gs.resetGame();
      gs.patchState({
        stage: 'career', turnsInStage: 0,
        stats: { ...st.createDefaultStats(), stamina: 90 },
      });
      gs.setFlag(flag);
      for (let t = 0; t < turns; t++) {
        gs.patchState({ turnsInStage: t });
        tf.advanceQuarter('career');
      }
      return {
        wear: gs.getCounter(sl.SURG_WEAR_KEY),
        floor: sl.sanityCrisisFloor(),
        tick: gs.getCounter(sl.OBGYN_TICK_KEY),
      };
    };

    return {
      obgyn: run('sub_obgyn', 10),
      surgery: run('sub_surgery', 10),
      peds: run('sub_pediatrics', 10),
      internal: run('sub_internal', 10),
    };
  });

  // 10 季：妇产科每 2 季 +1 → wear=5, floor=5
  expect(r.obgyn.tick).toBe(10);
  expect(r.obgyn.wear).toBe(5);
  expect(r.obgyn.floor).toBe(5);
  // 外科专轨更快
  expect(r.surgery.wear).toBeGreaterThan(r.obgyn.wear);
  expect(r.surgery.floor).toBe(0);
  // 儿科专轨危机更快
  expect(r.peds.floor).toBeGreaterThan(r.obgyn.floor);
  expect(r.peds.wear).toBe(0);
  // 内科仍不累积
  expect(r.internal.wear).toBe(0);
  expect(r.internal.floor).toBe(0);
});
