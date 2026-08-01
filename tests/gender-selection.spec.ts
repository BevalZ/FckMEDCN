import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 开局性别选择回归：GaokaoScene 开头先选男生/女生；
// 选择写入 GameState.gender，放榜夜等叙述文案按性别生成（儿子/女儿）。

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

const phaseTexts = (page: Page) => page.evaluate(() => {
  const scene = (window as any).game.scene.getScene('GaokaoScene');
  const list = scene.container?.list ?? scene.children.list;
  return list.filter((o: any) => o.type === 'Text').map((o: any) => o.text as string);
});

test('开局默认选男生：性别写入状态，放榜夜称"儿子"', async ({ page }) => {
  await toGaokao(page);

  // 性别选择阶段应出现
  const texts0 = await phaseTexts(page);
  expect(texts0.some((t: string) => t.includes('先介绍一下自己')), '应有性别选择阶段').toBe(true);
  expect(texts0.some((t: string) => t.includes('男生')), '应有男生选项').toBe(true);
  expect(texts0.some((t: string) => t.includes('女生')), '应有女生选项').toBe(true);

  // 回车选男生 → 进入估分阶段
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  const gender = await page.evaluate(() => ((window as any).__mod.gs.getState().gender));
  expect(gender, '默认回车应选男生').toBe('male');
  const texts1 = await phaseTexts(page);
  expect(texts1.some((t: string) => t.includes('你的高考成绩是多少')), '应进入估分阶段').toBe(true);

  // 选最高分 → 放榜夜应称"儿子"
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  const texts2 = await phaseTexts(page);
  expect(texts2.some((t: string) => t.includes('儿子')), '放榜夜应称儿子').toBe(true);
});

test('选女生：性别写入状态，放榜夜称"女儿"', async ({ page }) => {
  await toGaokao(page);

  // ↓ 选到女生再回车
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  const gender = await page.evaluate(() => ((window as any).__mod.gs.getState().gender));
  expect(gender, '选择女生后 gender 应为 female').toBe('female');

  // 选最高分 → 放榜夜应称"女儿"
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  const texts = await phaseTexts(page);
  expect(texts.some((t: string) => t.includes('女儿')), '放榜夜应称女儿').toBe(true);
  expect(texts.some((t: string) => t.includes('儿子')), '放榜夜不应再出现"儿子"').toBe(false);
});
