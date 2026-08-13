import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 图鉴线索渐进揭示 + 巅峰/退休新增强制节点。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('结局线索：未通关/雾面/清晰三级揭示', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { col, endingHints: eh, en } = (window as any).__mod;
    col.resetCollectionForTest();
    const none = eh.endingHintForGallery('disgraced');
    col.recordEnding('stable_at_45');
    const fog = eh.endingHintForGallery('disgraced');
    const fogLucky = eh.endingHintForGallery('lucky_fraud');
    // 再通两次 → runs=3 → clear
    col.recordEnding('master_clinician');
    col.recordEnding('exhausted_attending');
    const clear = eh.endingHintForGallery('disgraced');
    return {
      none,
      fog,
      fogLucky,
      clear,
      fullHint: en.ENDING_HINTS.disgraced,
      fogText: eh.ENDING_HINT_FOG.disgraced,
      clarityAt0: eh.hintClarity(0, 0),
      clarityAt1: eh.hintClarity(1, 1),
      clarityAt3: eh.hintClarity(3, 3),
    };
  });

  expect(r.none.clarity).toBe('none');
  expect(r.none.text).toContain('通关一次');
  expect(r.fog.clarity).toBe('fog');
  expect(r.fog.text).toBe(r.fogText);
  expect(r.fogLucky.clarity).toBe('fog');
  expect(r.fogLucky.text).toContain('造假');
  expect(r.clear.clarity).toBe('clear');
  expect(r.clear.text).toBe(r.fullHint);
  expect(r.clarityAt0).toBe('none');
  expect(r.clarityAt1).toBe('fog');
  expect(r.clarityAt3).toBe('clear');
});

test('巅峰缺人夜班 / 退休身份抽离：强制表与事件定义齐备', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { ev } = (window as any).__mod;
    const crisis = ev.ALL_EVENTS.find((e: any) => e.id === 'era6_dept_crisis');
    const identity = ev.ALL_EVENTS.find((e: any) => e.id === 'era7_identity_gap');
    return {
      crisis: {
        ok: !!crisis,
        stage: crisis?.stage,
        manualOnly: crisis?.manualOnly === true,
        minTurn: crisis?.minTurn,
        choices: crisis?.choices?.length ?? 0,
      },
      identity: {
        ok: !!identity,
        stage: identity?.stage,
        manualOnly: identity?.manualOnly === true,
        minTurn: identity?.minTurn,
        choices: identity?.choices?.length ?? 0,
      },
    };
  });

  expect(r.crisis.ok).toBe(true);
  expect(r.crisis.stage).toBe('pinnacle');
  expect(r.crisis.manualOnly).toBe(true);
  expect(r.crisis.minTurn).toBe(5);
  expect(r.crisis.choices).toBeGreaterThanOrEqual(2);
  expect(r.identity.ok).toBe(true);
  expect(r.identity.stage).toBe('retirement');
  expect(r.identity.manualOnly).toBe(true);
  expect(r.identity.minTurn).toBe(4);
  expect(r.identity.choices).toBeGreaterThanOrEqual(2);
});

test('Pinnacle/Retirement 场景在对应季强制新节点', async ({ page }) => {
  await boot(page);
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'TitleScene'),
    null, { timeout: 60000 },
  );

  // 巅峰第 5 季
  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'pinnacle', turnsInStage: 5 });
    (window as any).game.scene.getScene('TitleScene').scene.start('PinnacleScene');
  });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'PinnacleScene'),
    null, { timeout: 60000 },
  );
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await page.waitForFunction(
    () => {
      const s: any = (window as any).game.scene.getScene('PinnacleScene');
      return s.currentEvent?.id === 'era6_dept_crisis';
    },
    null, { timeout: 20000 },
  );
  const pinId = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('PinnacleScene');
    return s.currentEvent?.id ?? null;
  });
  expect(pinId).toBe('era6_dept_crisis');

  // 退休第 4 季
  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'retirement', turnsInStage: 4 });
    (window as any).game.scene.getScene('PinnacleScene').scene.start('RetirementScene');
  });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'RetirementScene'),
    null, { timeout: 60000 },
  );
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await page.waitForFunction(
    () => {
      const s: any = (window as any).game.scene.getScene('RetirementScene');
      return s.currentEvent?.id === 'era7_identity_gap';
    },
    null, { timeout: 20000 },
  );
  const retId = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('RetirementScene');
    return s.currentEvent?.id ?? null;
  });
  expect(retId).toBe('era7_identity_gap');
});
