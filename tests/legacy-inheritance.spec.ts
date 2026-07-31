import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 多周目传承回归：
// 1) 点数经济：通关 +1、每 5 徽章 +1；
// 2) buyPerk 扣点/防重复/点数不足拒绝；applyLegacyPerks 叠加到初始属性（走 clamp）；
// 3) 跨 reload 持久化 + 新开局自动应用（TitleScene → GaokaoScene 后属性带传承）；
// 4) 图鉴"传承"页渲染与空格购买。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 30000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

test('多周目传承：点数经济/购买/开局应用/图鉴渲染', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
  await waitForScene(page, 'TitleScene');

  // —— 1) 点数经济：通关 +1、每 5 徽章 +1 ——
  const r1 = await page.evaluate(() => {
    const { col, bad, gs } = (window as any).__mod;
    col.resetCollectionForTest();
    bad.clearPendingBadgesForTest();
    col.recordEnding('stable_at_45');
    col.recordEnding('master_clinician'); // 两次通关 → 2 点
    const afterEndings = col.getCollection().points;

    // 5 个 flag 徽章 → 满 5 奖 1 点
    for (const f of ['baoyan', 'kaoyan', 'saw_death', 'rotation_er', 'licensed']) gs.setFlag(f);
    bad.checkBadges();
    const c = col.getCollection();
    return { afterEndings, afterBadges: c.points, badgeCount: c.badges.size };
  });
  expect(r1.afterEndings, '通关两次应得 2 点').toBe(2);
  expect(r1.badgeCount, '5 个徽章').toBe(5);
  expect(r1.afterBadges, '满 5 徽章再 +1 点').toBe(3);

  // —— 2) 购买 / 防重复 / 点数不足 / 属性叠加 ——
  const r2 = await page.evaluate(() => {
    const { col, leg, stats } = (window as any).__mod;
    col.grantPoint(5); // 3 + 5 = 8 点
    const buyK = leg.tryBuyPerk('legacy_knowledge');   // 花 1
    const buyC = leg.tryBuyPerk('legacy_clinical');    // 花 2
    const buyKDup = leg.tryBuyPerk('legacy_knowledge'); // 已购 → false
    const buyR = leg.tryBuyPerk('legacy_research');    // 花 2
    const c = col.getCollection();
    const out = leg.applyLegacyPerks(stats.createDefaultStats());
    return {
      buyK, buyC, buyKDup, buyR,
      pointsLeft: c.points,
      purchased: Array.from(c.purchased),
      knowledge: out.knowledge, clinical: out.clinical, research: out.research,
    };
  });
  expect(r2.buyK && r2.buyC && r2.buyR, '应有足够点数购买').toBe(true);
  expect(r2.buyKDup, '已购 perk 不能重复买').toBe(false);
  expect(r2.pointsLeft, '8-1-2-2=3 点剩余').toBe(3);
  expect(r2.knowledge, '知识 30+12').toBe(42);
  expect(r2.clinical, '临床 5+6').toBe(11);
  expect(r2.research, '科研 5+6').toBe(11);

  // —— 3) 跨 reload 持久化 + 新开局自动应用 ——
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
  await waitForScene(page, 'TitleScene');
  const afterReload = await page.evaluate(() => {
    const { col, leg, gs, stats } = (window as any).__mod;
    const c = col.getCollection();
    return {
      points: c.points,
      purchased: Array.from(c.purchased),
      // TitleScene.create 已在新开局状态上应用过传承（reload 后即生效）
      titleStatsKnowledge: gs.getState().stats.knowledge,
      // 继续游戏路径不应被传承污染：模拟读档覆盖
      loaded: leg.applyLegacyPerks(stats.createDefaultStats()).knowledge,
    };
  });
  expect(afterReload.points, 'reload 后点数保留').toBe(3);
  expect(afterReload.purchased, 'reload 后已购保留').toContain('legacy_knowledge');
  expect(afterReload.titleStatsKnowledge, '新开局知识应带传承').toBe(42);

  // 点"开始游戏"进入 GaokaoScene，确认属性带传承且未被重置
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  const gaokaoStats = await page.evaluate(() => ((window as any).__mod.gs.getState().stats as any).knowledge);
  expect(gaokaoStats, 'GaokaoScene 起始知识应带传承').toBe(42);

  // —— 4) 图鉴传承页渲染与空格购买 ——
  // 先回标题（GaokaoScene 无法直接回，重新加载页面）
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
  await waitForScene(page, 'TitleScene');
  await page.keyboard.press('g');
  await waitForScene(page, 'CollectionScene');
  await page.keyboard.press('Tab'); // → 里程碑
  await page.keyboard.press('Tab'); // → 传承
  await page.keyboard.press('ArrowDown'); // 选中"家族资助"（可购未拥有）
  const rendered = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScene('CollectionScene');
    const texts = scene.children.list.filter((o: any) => o.type === 'Text').map((o: any) => o.text as string);
    return {
      tabActive: texts.some((t: string) => t.includes('传承')),
      progress: texts.some((t: string) => /传承点 3 · 已购 3 \/ \d+/.test(t)),
      ownedRow: texts.some((t: string) => t.includes('✓ 家学渊源 · 1 点')),
      affordableRow: texts.some((t: string) => t.includes('○ 家族资助 · 1 点')),
      detailBuyable: texts.some((t: string) => t.includes('可购买（按空格）')),
    };
  });
  expect(rendered.tabActive, '传承页签').toBe(true);
  expect(rendered.progress, '传承点数进度').toBe(true);
  expect(rendered.ownedRow, '已购 perk 应打勾').toBe(true);
  expect(rendered.affordableRow, '可购 perk 应金色显示').toBe(true);
  expect(rendered.detailBuyable, '详情应提示可购买').toBe(true);

  // 选中"家族资助"（当前选中）并按空格购买
  await page.keyboard.press('Space');
  const bought = await page.evaluate(() => {
    const { col } = (window as any).__mod;
    const c = col.getCollection();
    const scene = (window as any).game.scene.getScene('CollectionScene');
    const texts = scene.children.list.filter((o: any) => o.type === 'Text').map((o: any) => o.text as string);
    return {
      points: c.points,
      hasMoney: c.purchased.includes('legacy_money'),
      progress: texts.some((t: string) => /传承点 2 · 已购 4 \/ \d+/.test(t)),
    };
  });
  expect(bought.hasMoney, '空格应购买家族资助').toBe(true);
  expect(bought.points, '扣 1 点剩 2').toBe(2);
  expect(bought.progress, '进度行应刷新').toBe(true);

  await page.keyboard.press('Escape');
  await waitForScene(page, 'TitleScene');
});
