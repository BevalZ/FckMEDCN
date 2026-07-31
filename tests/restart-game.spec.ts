import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// "直接重新开档"（R 键）回归：
// 1) 游戏内按 R 弹出确认，空格确认后回到全新的 GaokaoScene（属性/flag/回合重置，存档清除）；
// 2) 有弹窗/事件展示时 R 不抢占（busy 守卫）。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 120000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

test('游戏内按 R 重新开档：确认后回新档且状态重置', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
  await waitForScene(page, 'TitleScene');

  // 清空图鉴（避免传承干扰断言）
  await page.evaluate(() => (window as any).__mod.col.resetCollectionForTest());

  // 开新局 → 进入校园
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await waitForScene(page, 'CampusScene');
  await page.keyboard.press('Enter'); // 关掉阶段经济简报
  await page.waitForTimeout(500);

  // 打上"已玩过"痕迹：改钱 + 置 flag
  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.patchState({ stats: { ...gs.getState().stats, money: 999999 } });
    gs.setFlag('ug_tutoring');
  });

  // 按 R → 应弹出确认
  await page.keyboard.press('r');
  await page.waitForTimeout(400);
  const confirmShown = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScene('CampusScene');
    const texts = scene.children.list.filter((o: any) => o.type === 'Text').map((o: any) => o.text as string);
    return texts.some((t: string) => t.includes('重新开档'));
  });
  expect(confirmShown, 'R 应弹出重新开档确认').toBe(true);

  // 空格确认 → 应回到全新 GaokaoScene，痕迹清空、存档清除
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
  expect(fresh.saveCleared, '存档应被清除').toBe(true);
});

test('卡片阶段事件卡按 ESC 跳过：不选择、推进本回合', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
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

  // ESC 跳过：事件卡关闭、回合推进、未做选择
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    const scene = (window as any).game.scene.getScene('CareerScene');
    return {
      cardGone: !scene.eventCard?.busy,
      turnsInStage: gs.getState().turnsInStage,
    };
  });
  expect(after.cardGone, 'ESC 后事件卡应关闭').toBe(true);
  expect(after.turnsInStage, 'ESC 跳过应推进本回合').toBeGreaterThan(before);
});
