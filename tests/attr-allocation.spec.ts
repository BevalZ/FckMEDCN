import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 开局点数分配回归：性别后进入属性分配（家境/成绩/运气/外貌，预算 10），
// ←/→ 调整、确认后写入 attrs + 家庭条件 + 起始属性加成；成绩决定分数线划档。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 120000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

async function toAttrPhase(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  await page.keyboard.press('Enter'); // 选男生
  await page.waitForTimeout(1000);
}

const phaseTexts = (page: Page) => page.evaluate(() => {
  const scene = (window as any).game.scene.getScene('GaokaoScene');
  const list = scene.container?.list ?? scene.children.list;
  return list.filter((o: any) => o.type === 'Text').map((o: any) => o.text as string);
});

test('属性分配：默认值、确认后写入 attrs 与起始属性', async ({ page }) => {
  await toAttrPhase(page);

  const texts = await phaseTexts(page);
  expect(texts.some((t: string) => t.includes('分配你的初始属性')), '应有属性分配阶段').toBe(true);
  expect(texts.some((t: string) => t.includes('剩余点数：0 / 10')), '默认分配应正好用完 10 点').toBe(true);
  expect(texts.some((t: string) => t.includes('家境')), '应有家境').toBe(true);
  expect(texts.some((t: string) => t.includes('成绩')), '应有成绩').toBe(true);
  expect(texts.some((t: string) => t.includes('运气')), '应有运气').toBe(true);
  expect(texts.some((t: string) => t.includes('外貌')), '应有外貌').toBe(true);

  // 回车确认（默认 家境2 成绩5 运气1 外貌2）
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  const state = await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    const s = gs.getState();
    return {
      attrs: s.attrs,
      familyWealth: s.familyWealth,
      knowledge: s.stats.knowledge,
      relations: s.stats.relations,
      sanity: s.stats.sanity,
    };
  });
  expect(state.attrs, '默认 attrs').toEqual({ family: 2, academic: 5, luck: 1, looks: 2 });
  expect(state.familyWealth, '家境 2 → 普通').toBe('middle');
  expect(state.knowledge, '知识 30 + 成绩5×5').toBe(55);
  expect(state.relations, '人际 50 + 外貌2×4').toBe(58);
  expect(state.sanity, '心理 85 + 运气1×2').toBe(87);
});

test('属性分配：可调整；成绩低时高分数档不可选', async ({ page }) => {
  await toAttrPhase(page);

  // ↓ 到"成绩"行，← 减 3 点（5→2），剩余 3 点（分步按压防丢键）
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(200);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(200); }
  const mid = await phaseTexts(page);
  expect(mid.some((t: string) => t.includes('剩余点数：3 / 10')), '减 3 点后应剩 3 点').toBe(true);

  // 回车确认 → 估分阶段应按成绩划档（成绩 2 → 最高 560-609 档，685 不可选）
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  const texts = await phaseTexts(page);
  expect(texts.some((t: string) => t.includes('你的高考成绩是多少')), '应进入估分阶段').toBe(true);
  expect(texts.some((t: string) => t.includes('以你的成绩底子（2/5）')), '应显示成绩档提示').toBe(true);
  expect(texts.some((t: string) => t.includes('更高的分数档需提升')), '应有划档提示').toBe(true);
  expect(texts.some((t: string) => t.includes('685分以上')), '成绩不足时不应出现 685 档').toBe(false);
});

test('助学贷款开关：在属性分配阶段可选并写入 student_loan', async ({ page }) => {
  await toAttrPhase(page);

  // ↓ 到"助学贷款"行（第 5 行），→ 开启，回车确认（分步按压防丢键）
  for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200); }
  const before = await phaseTexts(page);
  expect(before.some((t: string) => t.includes('助学贷款')), '应有助学贷款行').toBe(true);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  const toggled = await phaseTexts(page);
  expect(toggled.some((t: string) => t.includes('开')), '贷款应显示为开').toBe(true);

  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  const state = await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    return { hasLoan: gs.getState().flags.has('student_loan'), wealth: gs.getState().familyWealth };
  });
  expect(state.hasLoan, '开启后应写入 student_loan').toBe(true);
  expect(state.wealth, '默认家境 2 → 普通，可贷款').toBe('middle');
});
