import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// R13：诚实/普通局经职业期诚信薄路径可达 lucky_fraud / disgraced。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('职称论文灰色选择 → has_faked；评副高后判定 lucky_fraud', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf, ev, en, stats: st } = (window as any).__mod;
    Math.random = () => 0.999999;
    gs.resetGame();
    gs.patchState({
      stage: 'career',
      turnsInStage: 8,
      stats: { ...st.createDefaultStats(), papers: 2, reputation: 40, clinical: 40, research: 20 },
    });
    gs.setFlag('passed_zhuzhi');
    gs.setFlag('sub_internal');
    const pressure = ev.ALL_EVENTS.find((e: any) => e.id === 'career_title_paper_pressure');
    tf.commitChoice(pressure.choices[0], pressure); // 补数据
    const faked = gs.getState().flags.has('has_faked');
    gs.setFlag('passed_fugao');
    gs.patchState({ stage: 'career' });
    const ending = en.determineEnding(gs.getState());
    return {
      faked,
      padded: gs.getState().flags.has('title_paper_padded'),
      endingId: ending.id,
      fakeRisk: gs.getState().stats.fakeRisk,
    };
  });
  expect(r.faked).toBe(true);
  expect(r.padded).toBe(true);
  expect(r.fakeRisk).toBeGreaterThan(0);
  expect(r.endingId).toBe('lucky_fraud');
});

test('挂名硬刚失败 → exposed_ruin → disgraced', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf, ev, en, stats: st } = (window as any).__mod;
    Math.random = () => 0.99; // fail rollOutcome (need >= base to fail? fail when random >= p, so high random → fail)
    // rollOutcome: if Math.random() < p success else fail. So 0.99 → almost always fail → exposed_ruin
    gs.resetGame();
    gs.patchState({
      stage: 'career',
      turnsInStage: 12,
      stats: { ...st.createDefaultStats(), papers: 3, reputation: 50 },
      attrs: { family: 2, academic: 5, luck: 0, looks: 2 },
    });
    gs.setFlag('sub_internal');
    gs.setFlag('dept_scandal_done'); // won't matter; we're committing directly
    const scandal = ev.ALL_EVENTS.find((e: any) => e.id === 'career_dept_authorship_scandal');
    // clear done so commit can set it again - actually flagSet sets done
    gs.resetGame();
    gs.patchState({
      stage: 'career',
      turnsInStage: 12,
      stats: { ...st.createDefaultStats(), papers: 3, reputation: 50 },
      attrs: { family: 2, academic: 5, luck: 0, looks: 2 },
    });
    gs.setFlag('sub_internal');
    tf.commitChoice(scandal.choices[2], scandal); // 硬刚
    const ruin = gs.getState().flags.has('exposed_ruin');
    const ending = en.determineEnding(gs.getState());
    return {
      ruin,
      denied: gs.getState().flags.has('gift_authorship_denied'),
      endingId: ending.id,
    };
  });
  expect(r.denied).toBe(true);
  expect(r.ruin).toBe(true);
  expect(r.endingId).toBe('disgraced');
});

test('CareerScene 在对应季强制职称压力与挂名风暴', async ({ page }) => {
  await boot(page);
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'TitleScene'),
    null, { timeout: 60000 },
  );

  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'career', turnsInStage: 8 });
    gs.setFlag('sub_surgery');
    gs.setFlag('passed_zhuzhi');
    gs.setFlag('lawsuit_done_1');
    gs.setFlag('appraisal_resolved');
    gs.setFlag('chief_offer_resolved');
    gs.setFlag('er_rotation_done');
    gs.setFlag('legal_complaint_handled');
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
      return s.currentEvent?.id === 'career_title_paper_pressure';
    },
    null, { timeout: 20000 },
  );

  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.setFlag('title_paper_pressure_done');
    gs.setFlag('lawsuit_done_2');
    gs.patchState({ turnsInStage: 12 });
    const scene: any = (window as any).game.scene.getScene('CareerScene');
    scene.isEventShowing = false;
    scene.busy = false;
    scene.forcedEventId = null;
    scene.currentEvent = null;
    scene.triggerNextEvent();
  });
  await page.waitForFunction(
    () => {
      const s: any = (window as any).game.scene.getScene('CareerScene');
      return s.currentEvent?.id === 'career_dept_authorship_scandal';
    },
    null, { timeout: 20000 },
  );
  const id = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CareerScene');
    return s.currentEvent?.id ?? null;
  });
  expect(id).toBe('career_dept_authorship_scandal');
});
