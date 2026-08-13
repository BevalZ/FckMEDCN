import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// M11 诉讼长尾：鉴定节点加权、延迟回声可达、二审窗口强制触发。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('病历瑕疵降低鉴定有利概率，知情同意提升有利概率', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf, ev } = (window as any).__mod;
    const event = ev.ALL_EVENTS.find((e: { id: string }) => e.id === 'career_lawsuit_appraisal');
    const choice = event.choices[0];
    const run = (flags: string[], trials = 400) => {
      let win = 0;
      for (let i = 0; i < trials; i++) {
        gs.resetGame();
        gs.patchState({
          stage: 'career',
          stats: { ...gs.getState().stats, knowledge: 55, clinical: 50, reputation: 40 },
        });
        for (const f of flags) gs.setFlag(f);
        gs.setFlag('lawsuit_done_1');
        tf.commitChoice(choice, event);
        if (gs.getState().flags.has('appraisal_favorable')) win++;
        if (!gs.getState().flags.has('appraisal_resolved')) throw new Error('鉴定后应置 appraisal_resolved');
      }
      return win / trials;
    };
    return {
      baseline: run([]),
      sloppy: run(['record_sloppy']),
      consent: run(['informed_consent_ok']),
    };
  });
  expect(r.consent, '知情同意良好应更易有利鉴定').toBeGreaterThan(r.baseline);
  expect(r.baseline, '基线应高于病历瑕疵').toBeGreaterThan(r.sloppy);
  expect(r.sloppy).toBeGreaterThan(0.05);
  expect(r.consent).toBeLessThan(0.98);
});

test('鉴定回声与二审窗口按 flag 门控', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ev } = (window as any).__mod;
    const ids = (flags: string[], turn: number) => {
      gs.resetGame();
      gs.patchState({
        stage: 'career',
        stats: { ...gs.getState().stats, knowledge: 50, clinical: 45 },
      });
      for (const f of flags) gs.setFlag(f);
      return ev.getAvailableEvents('career', gs.getState().flags, gs.getState().stats, new Set(), turn, 'single')
        .map((e: { id: string }) => e.id);
    };
    return {
      winEcho: ids(['appraisal_favorable'], 7).includes('career_appraisal_win_echo'),
      loseEcho: ids(['appraisal_adverse'], 7).includes('career_appraisal_lose_echo'),
      noWinWithout: ids(['lawsuit_done_1'], 7).includes('career_appraisal_win_echo'),
      second: ids(['appraisal_adverse'], 13).includes('career_second_appeal'),
      secondOutside: ids(['appraisal_adverse'], 18).includes('career_second_appeal'),
      secondWithout: ids(['appraisal_favorable'], 13).includes('career_second_appeal'),
    };
  });
  expect(r.winEcho).toBe(true);
  expect(r.loseEcho).toBe(true);
  expect(r.noWinWithout).toBe(false);
  expect(r.second).toBe(true);
  expect(r.secondOutside).toBe(false);
  expect(r.secondWithout).toBe(false);
});

test('CareerScene 在诉讼后强制鉴定，不利鉴定后强制二审窗口', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'career', turnsInStage: 5 });
    gs.setFlag('sub_surgery');
    gs.setFlag('lawsuit_done_1');
    (window as any).game.scene.getScene('TitleScene').scene.start('CareerScene');
  });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'CareerScene'),
    null,
    { timeout: 60000 },
  );
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await page.waitForFunction(
    () => {
      const s: any = (window as any).game.scene.getScene('CareerScene');
      return s.currentEvent?.id === 'career_lawsuit_appraisal';
    },
    null,
    { timeout: 20000 },
  );

  const debug = await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.setFlag('appraisal_adverse');
    gs.setFlag('appraisal_resolved');
    gs.setFlag('lawsuit_done_2');
    gs.setFlag('legal_complaint_handled');
    gs.patchState({ turnsInStage: 13 });
    const scene: any = (window as any).game.scene.getScene('CareerScene');
    scene.isEventShowing = false;
    scene.busy = false;
    scene.forcedEventId = null;
    scene.currentEvent = null;
    scene.triggerNextEvent();
    return {
      forcedAttempt: scene.forcedEventId,
      current: scene.currentEvent?.id ?? null,
      flags: {
        adverse: gs.getState().flags.has('appraisal_adverse'),
        appeal: gs.getState().flags.has('second_appeal_done'),
        lawsuit2: gs.getState().flags.has('lawsuit_done_2'),
        turn: gs.getState().turnsInStage,
      },
    };
  });
  expect(debug.current, JSON.stringify(debug)).toBe('career_second_appeal');
});
