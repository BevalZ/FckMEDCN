import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 中优先级修复回归：
// 1) HUD 显示开局属性/家庭条件/理财策略（不再"分配完就忘"）；
// 2) 开局阶段可返回：属性阶段 ESC → 性别阶段，性别阶段 ESC → 标题。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 120000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

async function toGaokao(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
}

test('HUD 显示开局属性与家庭/理财策略', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({
      stage: 'undergrad',
      attrs: { family: 2, academic: 5, luck: 1, looks: 2 },
      familyWealth: 'middle',
      financeStrategy: 'stable',
    });
    (window as any).game.scene.start('CampusScene');
  });
  await waitForScene(page, 'CampusScene');
  await page.keyboard.press('Enter'); // 关简报
  await page.waitForTimeout(500);

  const texts = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScene('CampusScene');
    const out: string[] = [];
    const walk = (objs: any[]) => {
      for (const o of objs) {
        if (o.type === 'Text') out.push(o.text as string);
        if (o.list) walk(o.list);
      }
    };
    walk(scene.children.list);
    return out;
  });
  expect(texts.some((t: string) => t.includes('家境2/普通')), 'HUD 应显示家境与条件').toBe(true);
  expect(texts.some((t: string) => t.includes('成绩5')), 'HUD 应显示成绩').toBe(true);
  expect(texts.some((t: string) => t.includes('运气1')), 'HUD 应显示运气').toBe(true);
  expect(texts.some((t: string) => t.includes('外貌2')), 'HUD 应显示外貌').toBe(true);
  expect(texts.some((t: string) => t.includes('理财:稳健')), 'HUD 应显示理财策略').toBe(true);
  expect(texts.some((t: string) => t.includes('研5/0')), 'HUD 应显示科研系统摘要').toBe(true);
  expect(texts.some((t: string) => t.includes('派0')), 'HUD 应显示派系系统摘要').toBe(true);
  expect(texts.some((t: string) => t.includes('舆5')), 'HUD 应显示舆论系统摘要').toBe(true);
});

test('开局阶段 ESC 可返回', async ({ page }) => {
  await toGaokao(page);

  // 性别阶段 ESC → 标题
  await page.keyboard.press('Escape');
  await waitForScene(page, 'TitleScene');

  // 重进 → 属性阶段 ESC → 回性别阶段
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  await page.keyboard.press('Enter'); // 选男生 → 属性阶段
  await page.waitForTimeout(600);
  const inAttr = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScene('GaokaoScene');
    const list = scene.container?.list ?? scene.children.list;
    return list.filter((o: any) => o.type === 'Text').some((t: any) => t.text.includes('分配你的初始属性'));
  });
  expect(inAttr, '应已进入属性分配阶段').toBe(true);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const backToGender = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScene('GaokaoScene');
    const list = scene.container?.list ?? scene.children.list;
    return list.filter((o: any) => o.type === 'Text').some((t: any) => t.text.includes('选择你的性别'));
  });
  expect(backToGender, '属性阶段 ESC 应返回性别阶段').toBe(true);
});
