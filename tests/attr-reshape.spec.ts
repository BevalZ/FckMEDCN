import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 多周目属性部分继承 / 重塑：
// 通关后解锁；随机重分配合法；上局 attrs 可继承；次数随图鉴进度提升。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('重塑解锁门槛与随机分配合法性', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { col, attrReshape: ar } = (window as any).__mod;
    col.resetCollectionForTest();
    const locked = ar.reshapeAccess();

    col.recordEnding('stable_at_45', { family: 3, academic: 4, luck: 2, looks: 1 });
    const after1 = ar.reshapeAccess();
    const last = col.getLastAttrs();

    col.recordEnding('master_clinician', { family: 1, academic: 5, luck: 2, looks: 2 });
    col.recordEnding('exhausted_attending');
    const after3 = ar.reshapeAccess();

    const samples = [];
    let seed = 0.11;
    const rng = () => { seed = (seed * 17.3) % 1; return seed; };
    for (let i = 0; i < 40; i++) samples.push(ar.randomAttrAlloc(rng));
    const allValid = samples.every((a: any) => ar.isValidAttrAlloc(a));
    const budgets = samples.map((a: any) => ar.attrBudgetUsed(a));

    return {
      locked,
      after1,
      after3,
      last,
      allValid,
      budgetsOk: budgets.every((b: number) => b === ar.ATTR_BUDGET),
      sample: samples[0],
    };
  });

  expect(r.locked.unlocked).toBe(false);
  expect(r.locked.maxRerolls).toBe(0);
  expect(r.after1.unlocked).toBe(true);
  expect(r.after1.maxRerolls).toBe(1);
  expect(r.after1.canInherit).toBe(true);
  expect(r.last).toEqual({ family: 3, academic: 4, luck: 2, looks: 1 });
  expect(r.after3.maxRerolls, '通关≥3 应升到 2 次重塑').toBe(2);
  expect(r.allValid).toBe(true);
  expect(r.budgetsOk).toBe(true);
});

test('属性分配界面：通关后显示重塑提示，R 会改分配', async ({ page }) => {
  await boot(page);
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'TitleScene'),
    null, { timeout: 60000 },
  );

  await page.evaluate(() => {
    const { col } = (window as any).__mod;
    col.resetCollectionForTest();
    col.recordEnding('stable_at_45', { family: 4, academic: 3, luck: 2, looks: 1 });
  });

  await page.waitForFunction(() => document.getElementById('title-overlay')?.dataset.ready === 'true');
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'GaokaoScene'),
    null, { timeout: 60000 },
  );
  await page.keyboard.press('Enter'); // 选男生
  await page.waitForTimeout(800);

  // 等到属性分配阶段
  for (let i = 0; i < 6; i++) {
    const hit = await page.evaluate(() => {
      const scene: any = (window as any).game.scene.getScene('GaokaoScene');
      const list = scene.container?.list ?? [];
      return list.some((o: any) => o.type === 'Text' && String(o.text).includes('分配你的初始属性'));
    });
    if (hit) break;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  }

  const before = await page.evaluate(() => {
    const scene: any = (window as any).game.scene.getScene('GaokaoScene');
    const texts = (scene.container?.list ?? [])
      .filter((o: any) => o.type === 'Text')
      .map((o: any) => o.text as string);
    return {
      hint: texts.find((t: string) => t.includes('多周目重塑')) ?? '',
      foot: texts.find((t: string) => t.includes('R 重塑')) ?? '',
      values: { ...scene.attrValues },
      left: scene.reshapeLeft,
    };
  });
  expect(before.hint, '应显示重塑剩余提示').toContain('多周目重塑');
  expect(before.foot, '页脚应提示 R/I').toContain('R 重塑');
  expect(before.left).toBe(1);

  // I 继承上局
  await page.keyboard.press('i');
  await page.waitForTimeout(200);
  const inherited = await page.evaluate(() => {
    const scene: any = (window as any).game.scene.getScene('GaokaoScene');
    return { ...scene.attrValues };
  });
  expect(inherited).toEqual({ family: 4, academic: 3, luck: 2, looks: 1 });

  // R 随机重塑（固定 Math.random 让结果可断言「已变化且合法」）
  await page.evaluate(() => { Math.random = () => 0.42; });
  await page.keyboard.press('r');
  await page.waitForTimeout(200);
  const afterR = await page.evaluate(() => {
    const { attrReshape: ar } = (window as any).__mod;
    const scene: any = (window as any).game.scene.getScene('GaokaoScene');
    return {
      values: { ...scene.attrValues },
      left: scene.reshapeLeft,
      valid: ar.isValidAttrAlloc(scene.attrValues),
    };
  });
  expect(afterR.valid).toBe(true);
  expect(afterR.left).toBe(0);
  expect(afterR.values).not.toEqual(inherited);
});
