import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
});

test('疫情周期在10至15年之间并持久存在状态中', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { pandemic } = (window as any).__mod;
    const low = pandemic.createPandemicState(2024, 3, () => 0);
    const high = pandemic.createPandemicState(2024, 3, () => 0.999999);
    const start = 2024 * 4 + 2;
    return { low: low.nextOutbreakAt - start, high: high.nextOutbreakAt - start };
  });
  expect(result.low).toBe(40);
  expect(result.high).toBe(60);
});

test('疫情爆发、持续、响应和结束形成闭环', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { gs, pandemic, ev, tf } = (window as any).__mod;
    gs.resetGame();
    const state = gs.getState();
    const now = state.year * 4 + state.quarter - 1;
    gs.patchState({ pandemic: { active: false, severity: 'localized', remainingQuarters: 0, nextOutbreakAt: now, outbreakCount: 0, quartersServed: 0 } });
    const started = pandemic.tickPandemicQuarter('career', () => 0.7);
    const scheduledAtStart = gs.getState().pandemic.nextOutbreakAt;
    const response = ev.ALL_EVENTS.find((event: any) => event.id === 'pandemic_response');
    tf.commitChoice(response.choices[0], response);
    let outcome = started;
    for (let quarter = 0; quarter < 8 && gs.getState().pandemic.active; quarter++) {
      outcome = pandemic.tickPandemicQuarter('career', () => 0);
    }
    return {
      started: started.started,
      severity: started.severity,
      burden: (started.delta.stamina ?? 0) < 0 && (started.delta.sanity ?? 0) < 0,
      responseDueAfterChoice: gs.hasFlag('pandemic_response_due'),
      ended: outcome.ended,
      active: gs.getState().pandemic.active,
      nextDelay: gs.getState().pandemic.nextOutbreakAt - (gs.getState().year * 4 + gs.getState().quarter - 1),
      scheduleStable: gs.getState().pandemic.nextOutbreakAt === scheduledAtStart,
    };
  });
  expect(result.started).toBe(true);
  expect(result.severity).toBe('regional');
  expect(result.burden).toBe(true);
  expect(result.responseDueAfterChoice).toBe(false);
  expect(result.ended).toBe(true);
  expect(result.active).toBe(false);
  expect(result.nextDelay).toBeGreaterThanOrEqual(40);
  expect(result.nextDelay).toBeLessThanOrEqual(60);
  expect(result.scheduleStable).toBe(true);
});

test('疫情标记只在爆发期解锁专属事件', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { ev, stats } = (window as any).__mod;
    const base = stats.createDefaultStats();
    const available = (flags: string[]) => ev.getAvailableEvents('career', new Set(flags), base, new Set(), 4, 'single').map((event: any) => event.id);
    return {
      normal: available([]).includes('pandemic_fever_clinic'),
      outbreak: available(['pandemic_active']).includes('pandemic_fever_clinic'),
      response: available(['pandemic_response_due']).includes('pandemic_response'),
    };
  });
  expect(result.normal).toBe(false);
  expect(result.outbreak).toBe(true);
  expect(result.response).toBe(true);
});
