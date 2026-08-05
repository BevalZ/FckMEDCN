import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('属性成长：救助/隐瞒改变运气并写入历史', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, ev, tf } = (window as any).__mod;
    const event = ev.ALL_EVENTS.find((item: any) => item.id === 'career_needlestick');
    gs.resetGame();
    gs.patchState({ attrs: { family: 2, academic: 5, luck: 2, looks: 2 } });
    tf.commitChoice(event.choices[0], event);
    const rescued = { luck: gs.getState().attrs.luck, headline: gs.getState().newsLog[0]?.headline };
    gs.resetGame();
    gs.patchState({ attrs: { family: 2, academic: 5, luck: 2, looks: 2 } });
    tf.commitChoice(event.choices[1], event);
    const hidden = { luck: gs.getState().attrs.luck, headline: gs.getState().newsLog[0]?.headline };
    return { rescued, hidden };
  });
  expect(result.rescued.luck).toBe(3);
  expect(result.hidden.luck).toBe(1);
  expect(result.rescued.headline).toContain('及时上报职业暴露');
  expect(result.hidden.headline).toContain('忽视职业暴露');
});

test('属性成长：职业长期夜班每四季磨损外貌且有上下限', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({
      stage: 'career', turnsInStage: 0,
      attrs: { family: 2, academic: 5, luck: 2, looks: 5 },
      flags: new Set(['sub_internal']),
    });
    for (let i = 0; i < 24; i++) tf.advanceQuarter('career');
    return { looks: gs.getState().attrs.looks, history: gs.getState().newsLog.filter((item: any) => item.headline.includes('长期夜班')).length };
  });
  expect(result.looks).toBe(0);
  expect(result.history).toBe(5);
});
