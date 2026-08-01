import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 性别修改入口回归：
// 1) 标题页（存档界面）"修改性别"按钮 → 选女生 → 写回存档，继续游戏生效；
// 2) 游戏内 R 菜单"修改性别"子菜单 → 改性别即时生效并持久化。

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
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await waitForScene(page, 'CampusScene');
  await page.keyboard.press('Enter'); // 关简报
  await page.waitForTimeout(500);
}

test('标题页存档界面修改性别：写回存档', async ({ page }) => {
  await enterCampus(page);

  // R 菜单 → 返回标题（自动存档保留）
  await page.keyboard.press('r');
  await page.waitForTimeout(400);
  await page.keyboard.press('2');
  await waitForScene(page, 'TitleScene');

  // 存档存在时应有"修改性别"入口
  const hasEntry = await page.evaluate(() => !!document.getElementById('title-gender-edit'));
  expect(hasEntry, '标题页应有性别修改入口').toBe(true);

  // 点开选择面板
  await page.evaluate(() => (document.getElementById('title-gender-edit') as HTMLButtonElement).click());
  await page.waitForTimeout(300);
  const panelVisible = await page.evaluate(() => (document.getElementById('gender-edit-panel')?.classList.contains('show') ?? false));
  expect(panelVisible, '点修改性别应弹出男生/女生选择').toBe(true);

  // 选女生 → 写回存档
  await page.evaluate(() => (document.getElementById('gender-pick-female') as HTMLButtonElement).click());
  await page.waitForTimeout(400);
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('fckmedcn_save_v1');
    if (!raw) return null;
    const blob = JSON.parse(raw);
    return { gender: blob.state.gender, sceneKey: blob.sceneKey };
  });
  expect(saved?.gender, '存档中的 gender 应更新为 female').toBe('female');
  expect(saved?.sceneKey, '存档场景应保留').toBe('CampusScene');
});

test('游戏内 R 菜单修改性别：即时生效并持久化', async ({ page }) => {
  await enterCampus(page);
  expect(await page.evaluate(() => ((window as any).__mod.gs.getState().gender)), '初始应为 male').toBe('male');

  // R → 菜单 → 修改性别（第 3 项）→ 选女生
  await page.keyboard.press('r');
  await page.waitForTimeout(400);
  await page.keyboard.press('3');
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowDown'); // 男生 → 女生
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    const raw = localStorage.getItem('fckmedcn_save_v1');
    return {
      gender: gs.getState().gender,
      savedGender: raw ? JSON.parse(raw).state.gender : null,
    };
  });
  expect(state.gender, '游戏内 gender 应改为 female').toBe('female');
  expect(state.savedGender, '存档应同步 female').toBe('female');
});
