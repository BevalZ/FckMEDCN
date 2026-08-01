import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 验证本科新增的结构性分支真的生效：
//   left_undergrad → 本季结束直接进 EndingScene（新结局 left_undergrad）
//   ug_holdback    → 本科总季度 20 → 24，信息条标注"重修中"

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 120000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

async function enterCampus(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await waitForScene(page, 'CampusScene');
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => (window as any).game.scene.getScene('CampusScene').busy === false,
    null, { timeout: 10000 },
  );
}

test('退学：left_undergrad 直接触发结局', async ({ page }) => {
  await enterCampus(page);

  // 置退学 flag，然后耗尽行动点睡觉
  await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    (window as any).__setFlag('left_undergrad');
    s.actionsLeft = 0;
    s.refreshInfoBar();
  });
  await page.keyboard.press('e');

  await waitForScene(page, 'EndingScene', 20000);

  const endingId = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('EndingScene');
    return s.sys.settings.data?.endingId ?? null;
  });
  expect(endingId).toBe('left_undergrad');
});

test('留级：ug_holdback 把本科延长到 24 季', async ({ page }) => {
  await enterCampus(page);

  const before = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    return { total: s.totalTurns(), label: s.infoLabel.text };
  });
  expect(before.total).toBe(20);
  expect(before.label).not.toContain('重修');

  const after = await page.evaluate(() => {
    (window as any).__setFlag('ug_holdback');
    const s: any = (window as any).game.scene.getScene('CampusScene');
    s.refreshInfoBar();
    return { total: s.totalTurns(), label: s.infoLabel.text };
  });
  expect(after.total).toBe(24);
  expect(after.label).toContain('重修中');

  // 到第 20 季不应转阶段（留级后要读到 24）
  const stillHere = await page.evaluate(async () => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    (window as any).__patchState({ turnsInStage: 20 });
    s.actionsLeft = 0;
    return s.totalTurns() > (window as any).__state().turnsInStage;
  });
  expect(stillHere, '留级后第 20 季仍应继续读').toBeTruthy();
});
