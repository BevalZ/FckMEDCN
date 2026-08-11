import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

test('找对象机会受心理与年龄衰减，成功率受外貌和经济显著影响', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  const result = await page.evaluate(() => {
    const { dating } = (window as any).__mod;
    return {
      sanityLow: dating.datingOpportunityChance(10, 30),
      sanityHigh: dating.datingOpportunityChance(90, 30),
      age35: dating.datingOpportunityChance(80, 35),
      age40: dating.datingOpportunityChance(80, 40),
      age50: dating.datingOpportunityChance(80, 50),
      weak: dating.datingSuccessChance(0, -5000, 0, 60),
      looksOnly: dating.datingSuccessChance(5, -5000, 0, 60),
      economyOnly: dating.datingSuccessChance(0, 180000, 0, 60),
      strong: dating.datingSuccessChance(5, 180000, 0, 60),
    };
  });
  expect(result.sanityHigh).toBeGreaterThan(result.sanityLow * 2);
  expect(result.age35).toBeGreaterThan(result.age40);
  expect(result.age40).toBeGreaterThan(result.age50);
  expect(result.looksOnly).toBeGreaterThan(result.weak + 0.4);
  expect(result.economyOnly).toBeGreaterThan(result.weak + 0.2);
  expect(result.strong).toBeGreaterThan(0.75);
});

test('找对象成功和失败都会消费本次机会', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  const result = await page.evaluate(() => {
    const { gs, dating, stats } = (window as any).__mod;
    const original = Math.random;
    gs.resetGame();
    gs.patchState({ stats: { ...stats.createDefaultStats(), money: 200000, sanity: 90 }, attrs: { family: 2, academic: 2, luck: 2, looks: 5 } });
    gs.setFlag('dating_opportunity');
    Math.random = () => 0;
    const success = dating.attemptDating();
    const successConsumed = !gs.hasFlag('dating_opportunity') && gs.getState().marital === 'dating';
    Math.random = original;
    gs.resetGame();
    gs.patchState({ stats: { ...stats.createDefaultStats(), money: -5000, sanity: 20 }, attrs: { family: 2, academic: 2, luck: 2, looks: 0 } });
    gs.setFlag('dating_opportunity');
    Math.random = () => 0.99;
    const failure = dating.attemptDating();
    const failureConsumed = !gs.hasFlag('dating_opportunity') && gs.getState().marital === 'single';
    Math.random = original;
    return { success: success.success, successConsumed, failure: failure.success, failureConsumed };
  });
  expect(result).toEqual({ success: true, successConsumed: true, failure: false, failureConsumed: true });
});

test('找对象机会触发后会作为优先生活节点进入事件池', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  const result = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'career', turnsInStage: 8, marital: 'single' });
    gs.setFlag('dating_opportunity');
    return Array.from({ length: 20 }, () => tf.drawStorylet('career', new Set())?.id);
  });
  expect(new Set(result)).toEqual(new Set(['life_meet_love']));
});
