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

test('中途修改性别后所有称谓渲染一致', async ({ page }) => {
  await enterCampus(page);

  const forceOpen = (id: string) => page.evaluate((evId) => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    const ev = (window as any).__mod.ev.ALL_EVENTS.find((e: any) => e.id === evId);
    if (ev) s.openEvent(ev);
  }, id);
  const cardBody = () => page.evaluate(() => {
    const scene: any = (window as any).game.scene.getScene('CampusScene');
    return (scene.eventCard?.container?.list ?? [])
      .filter((o: any) => o.type === 'Text').map((o: any) => o.text as string).join('|');
  });
  const consequenceText = () => page.evaluate(() => {
    const scene: any = (window as any).game.scene.getScene('CampusScene');
    return (scene.consequence?.container?.list ?? [])
      .filter((o: any) => o.type === 'Text').map((o: any) => o.text as string).join('|');
  });

  // ① 初始 male：国奖后果称"儿子"
  await forceOpen('ug_guojiang_result');
  await page.keyboard.press('1');
  await page.waitForTimeout(500);
  expect(await consequenceText(), 'male 国奖后果应称儿子').toContain('我儿子拿了国奖');

  // ② 留级卡正文称"学长"
  await page.keyboard.press('Escape'); // 关后果弹窗
  await page.waitForTimeout(300);
  await forceOpen('ug_holdback_life');
  await page.waitForTimeout(400);
  expect(await cardBody(), 'male 留级卡正文应称学长').toContain('学长');
  await page.keyboard.press('Escape'); // 关事件卡
  await page.waitForTimeout(300);

  // ③ 中途改性别为女生
  await page.keyboard.press('r');
  await page.waitForTimeout(400);
  await page.keyboard.press('3'); // 修改性别
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowDown'); // 男生 → 女生
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => ((window as any).__mod.gs.getState().gender)), '应改为 female').toBe('female');

  // ④ 改后国奖后果称"女儿"
  await forceOpen('ug_guojiang_result');
  await page.keyboard.press('1');
  await page.waitForTimeout(500);
  expect(await consequenceText(), 'female 国奖后果应称女儿').toContain('我女儿拿了国奖');

  // ⑤ 留级卡正文称"学姐"
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await forceOpen('ug_holdback_life');
  await page.waitForTimeout(400);
  expect(await cardBody(), 'female 留级卡正文应称学姐').toContain('学姐');
});
