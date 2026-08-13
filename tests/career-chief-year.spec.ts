import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 住院总一年：任命强制、任期内双压、满 4 季结业奖；婉拒不累积。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('住院总：接受后双压累积，满四季可结业并发奖', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf, ev, stats: st } = (window as any).__mod;
    Math.random = () => 0.999999;

    gs.resetGame();
    gs.patchState({
      stage: 'career',
      turnsInStage: 5,
      stats: { ...st.createDefaultStats(), stamina: 80, sanity: 80, money: 10000, reputation: 20 },
    });
    gs.setFlag('passed_zhuzhi');
    gs.setFlag('sub_internal');

    const offer = ev.ALL_EVENTS.find((e: { id: string }) => e.id === 'career_chief_offer');
    tf.commitChoice(offer.choices[0], offer);

    for (let t = 0; t < 4; t++) {
      gs.patchState({ turnsInStage: 5 + t });
      tf.advanceQuarter('career');
    }
    const afterYear = {
      quarters: gs.getCounter('chief_quarters'),
      stamina: gs.getState().stats.stamina,
      sanity: gs.getState().stats.sanity,
      stillChief: gs.getState().flags.has('chief_resident_year'),
    };

    gs.resetGame();
    gs.patchState({
      stage: 'career', turnsInStage: 5,
      stats: { ...st.createDefaultStats(), stamina: 80, sanity: 80, money: 10000 },
    });
    gs.setFlag('sub_internal');
    for (let t = 0; t < 4; t++) {
      gs.patchState({ turnsInStage: 5 + t });
      tf.advanceQuarter('career');
    }
    const baseline = {
      stamina: gs.getState().stats.stamina,
      sanity: gs.getState().stats.sanity,
    };

    gs.resetGame();
    gs.patchState({
      stage: 'career', turnsInStage: 9,
      stats: { ...st.createDefaultStats(), stamina: 50, sanity: 50, money: 10000, reputation: 20, clinical: 30 },
      counters: { chief_quarters: 4 },
    });
    gs.setFlag('passed_zhuzhi');
    gs.setFlag('chief_resident_year');
    gs.setFlag('chief_offer_resolved');
    gs.setFlag('chief_mid_done');
    const grad = ev.ALL_EVENTS.find((e: { id: string }) => e.id === 'career_chief_graduate');
    const beforeMoney = gs.getState().stats.money;
    const beforeRep = gs.getState().stats.reputation;
    tf.commitChoice(grad.choices[0], grad);

    return {
      afterYear,
      baseline,
      graduated: gs.getState().flags.has('chief_graduated'),
      yearCleared: !gs.getState().flags.has('chief_resident_year'),
      moneyGain: gs.getState().stats.money - beforeMoney,
      repGain: gs.getState().stats.reputation - beforeRep,
    };
  });

  expect(r.afterYear.quarters).toBe(4);
  expect(r.afterYear.stillChief).toBe(true);
  expect(r.afterYear.stamina, '住院总应比纯内科更耗体力').toBeLessThan(r.baseline.stamina);
  expect(r.afterYear.sanity, '住院总应比纯内科更耗心理').toBeLessThan(r.baseline.sanity);
  expect(r.graduated).toBe(true);
  expect(r.yearCleared).toBe(true);
  expect(r.moneyGain).toBe(8000);
  expect(r.repGain).toBe(8);
});

test('住院总：婉拒不进任期；满四季结业强制优先于第二起诉讼', async ({ page }) => {
  await boot(page);

  const declined = await page.evaluate(() => {
    const { gs, tf, ev, stats: st } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'career', turnsInStage: 5, stats: st.createDefaultStats() });
    gs.setFlag('passed_zhuzhi');
    const offer = ev.ALL_EVENTS.find((e: { id: string }) => e.id === 'career_chief_offer');
    tf.commitChoice(offer.choices[1], offer);
    return {
      declined: gs.getState().flags.has('chief_declined'),
      resolved: gs.getState().flags.has('chief_offer_resolved'),
      year: gs.getState().flags.has('chief_resident_year'),
      quarters: gs.getCounter('chief_quarters'),
    };
  });
  expect(declined.declined).toBe(true);
  expect(declined.resolved).toBe(true);
  expect(declined.year).toBe(false);
  expect(declined.quarters).toBe(0);

  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({
      stage: 'career',
      turnsInStage: 9,
      counters: { chief_quarters: 4 },
    });
    gs.setFlag('passed_zhuzhi');
    gs.setFlag('sub_surgery');
    gs.setFlag('lawsuit_done_1');
    gs.setFlag('appraisal_resolved');
    gs.setFlag('chief_resident_year');
    gs.setFlag('chief_offer_resolved');
    gs.setFlag('chief_mid_done');
    gs.setFlag('legal_complaint_handled');
    (window as any).game.scene.getScene('TitleScene').scene.start('CareerScene');
  });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'CareerScene'),
    null,
    { timeout: 60000 },
  );
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  const forced = await page.evaluate(() => {
    const scene: any = (window as any).game.scene.getScene('CareerScene');
    scene.isEventShowing = false;
    scene.busy = false;
    scene.forcedEventId = null;
    scene.currentEvent = null;
    scene.firedEvents?.delete('career_chief_graduate');
    scene.triggerNextEvent();
    return scene.currentEvent?.id ?? null;
  });
  expect(forced).toBe('career_chief_graduate');
});
