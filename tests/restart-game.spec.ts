import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 游戏内菜单（R 键）回归：
// 1) R 打开菜单，数字键选择，空格确认；
// 2) "返回标题"保留存档（自动存档在，标题页可继续游戏恢复）；
// 3) "重新开档"先弹确认，空格确认后回全新 GaokaoScene（属性/flag/回合重置，存档清除）。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 120000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

async function enterCampus(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => (window as any).__mod.col.resetCollectionForTest());
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  for (let i = 0; i < 7; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await waitForScene(page, 'CampusScene');
  await page.keyboard.press('Enter'); // 关掉阶段经济简报
  await page.waitForTimeout(500);
}

test('游戏菜单：返回标题保留存档', async ({ page }) => {
  await enterCampus(page);

  // 打上"已玩过"痕迹并确认存档存在
  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.patchState({ stats: { ...gs.getState().stats, money: 999999 } });
    gs.setFlag('ug_tutoring');
  });
  await page.waitForTimeout(300);
  const saveBefore = await page.evaluate(() => localStorage.getItem('fckmedcn_save_v1') !== null);
  expect(saveBefore, '游玩中应有自动存档').toBe(true);

  // R → 菜单 → 选"返回标题"
  await page.keyboard.press('r');
  await page.waitForTimeout(400);
  const menuShown = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScene('CampusScene');
    return scene.children.list.some((o: any) => o.type === 'Container' && o.depth === 190 && o.list && o.list.length > 0);
  });
  expect(menuShown, 'R 应打开游戏菜单').toBe(true);

  await page.keyboard.press('2'); // 返回标题
  await waitForScene(page, 'TitleScene');

  const saveAfter = await page.evaluate(() => localStorage.getItem('fckmedcn_save_v1') !== null);
  expect(saveAfter, '返回标题不应清除存档').toBe(true);
});

test('游戏菜单：重新开档 → 确认 → 回新档且状态重置', async ({ page }) => {
  await enterCampus(page);

  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.patchState({ stats: { ...gs.getState().stats, money: 999999 } });
    gs.setFlag('ug_tutoring');
  });

  // R → 菜单 → 选"重新开档"（第 5 项，前面有 继续/返回标题/修改性别/理财策略）→ 弹确认
  await page.keyboard.press('r');
  await page.waitForTimeout(400);
  await page.keyboard.press('5');
  await page.waitForTimeout(400);
  const confirmShown = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScene('CampusScene');
    return scene.children.list.some((o: any) => o.type === 'Text' && (o.text as string).includes('重新开档'));
  });
  expect(confirmShown, '选重新开档应弹确认').toBe(true);

  // 空格确认 → 回到全新 GaokaoScene
  await page.keyboard.press('Space');
  await waitForScene(page, 'GaokaoScene');
  const fresh = await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    const s = gs.getState();
    return {
      stage: s.stage,
      turnsInStage: s.turnsInStage,
      age: s.stats.age,
      money: s.stats.money,
      hasMarkerFlag: s.flags.has('ug_tutoring'),
      saveCleared: localStorage.getItem('fckmedcn_save_v1') === null,
    };
  });
  expect(fresh.stage, '应回到 gaokao 阶段').toBe('gaokao');
  expect(fresh.turnsInStage, '回合数归零').toBe(0);
  expect(fresh.age, '年龄回到 18').toBe(18);
  expect(fresh.money, '钱回到初始（5000+无传承）').toBe(5000);
  expect(fresh.hasMarkerFlag, 'flag 已清空').toBe(false);
  expect(fresh.saveCleared, '重开应清除存档').toBe(true);
});

test('卡片阶段事件卡按 ESC 跳过：不选择、推进本回合', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await waitForScene(page, 'TitleScene');

  // 直接以职业阶段开局（该阶段无小游戏事件，首个 storylet 必是事件卡）
  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.patchState({ stage: 'career', turnsInStage: 0 });
    // ScenePlugin.start 会先停当前场景（TitleScene）再启动目标，避免双场景并存
    (window as any).game.scene.getScene('TitleScene').scene.start('CareerScene');
  });
  await waitForScene(page, 'CareerScene');

  // 关掉阶段经济简报 → 首个事件卡出现（选项文字在卡片容器内，用 eventCard.busy 判断）
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const scene = (window as any).game.scene.getScene('CareerScene');
    return !!scene && scene.eventCard?.busy === true;
  }, null, { timeout: 15000 });

  const before = await page.evaluate(() => ((window as any).__mod.gs.getState().turnsInStage));

  // ESC 跳过：回合应推进（跳过后会按无事件推进，并可能立刻画出下一张卡）
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    (b) => ((window as any).__mod.gs.getState().turnsInStage) > b,
    before, { timeout: 5000 },
  );
  const after = await page.evaluate(() => ((window as any).__mod.gs.getState().turnsInStage));
  expect(after, 'ESC 跳过应推进本回合').toBeGreaterThan(before);
});
