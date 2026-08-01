import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// H 键帮助面板回归：行走场景按 H 弹出操作帮助，再按 H 关闭；事件展示期间 H 不抢占。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 120000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

async function helpVisible(page: Page, sceneKey: string): Promise<boolean> {
  return page.evaluate((key) => {
    const scene = (window as any).game.scene.getScene(key);
    return scene.children.list.some((o: any) => o.type === 'Container' && o.depth === 200 && o.list && o.list.length > 0);
  }, sceneKey);
}

test('H 键帮助面板：弹出/关闭', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await waitForScene(page, 'CampusScene');
  await page.keyboard.press('Enter'); // 简报
  await page.waitForTimeout(400);

  // 事件卡可能在展示；若在，先 ESC 关掉（行走场景取消交互）
  const cardBusy = await page.evaluate(() => (window as any).game.scene.getScene('CampusScene').eventCard?.busy ?? null);
  if (cardBusy) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  await page.keyboard.press('h');
  await page.waitForTimeout(300);
  expect(await helpVisible(page, 'CampusScene'), 'H 应弹出帮助面板').toBe(true);

  const texts = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScene('CampusScene');
    const c = scene.children.list.find((o: any) => o.type === 'Container' && o.depth === 200);
    return (c?.list ?? []).filter((o: any) => o.type === 'Text').map((o: any) => o.text as string);
  });
  expect(texts.some((t: string) => t.includes('操作帮助')), '面板应含标题').toBe(true);
  expect(texts.some((t: string) => t.includes('移动 WASD')), '面板应含操作说明').toBe(true);
  expect(texts.some((t: string) => t.includes('技能中心可练缝合')), '面板应含阶段提示').toBe(true);

  await page.keyboard.press('h');
  await page.waitForTimeout(300);
  expect(await helpVisible(page, 'CampusScene'), '再按 H 应关闭帮助面板').toBe(false);
});
