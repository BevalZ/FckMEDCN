import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 生涯里程碑（徽章）回归：
// 1) flag/state 条件达成 → checkBadges 解锁 → 图鉴持久化 → 跨 reload 保留、不重复解锁；
// 2) takePendingBadges 队列（供 ConsequencePopup 展示）；
// 3) 图鉴"生涯里程碑"页渲染：已达成/未达成显示、翻页不越界。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 30000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

test('生涯里程碑：解锁/持久化/队列/图鉴渲染', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
  await waitForScene(page, 'TitleScene');

  // —— 1) flag 条件解锁 ——
  const r1 = await page.evaluate(() => {
    const { bad, col, gs } = (window as any).__mod;
    col.resetCollectionForTest();
    bad.clearPendingBadgesForTest();
    gs.setFlag('passed_zhuzhi');
    gs.setFlag('passed_fugao');
    const fresh = bad.checkBadges();
    const ids = fresh.map((b: any) => b.id);
    const pending = bad.takePendingBadges();
    const col1 = col.getCollection();
    return {
      hasZhuzhi: ids.includes('b_zhuzhi'), hasFugao: ids.includes('b_fugao'),
      pending, badgesStored: col1.badges.has('b_zhuzhi') && col1.badges.has('b_fugao'),
    };
  });
  expect(r1.hasZhuzhi && r1.hasFugao, 'flag 满足应解锁对应徽章').toBe(true);
  expect(r1.pending, '待展示队列应含新徽章标题').toContain('主治在手');
  expect(r1.badgesStored, '徽章应写入图鉴').toBe(true);

  // —— 2) state 条件（婚姻）解锁 + 二次检查不重复 ——
  const r2 = await page.evaluate(() => {
    const { bad, col, gs } = (window as any).__mod;
    gs.patchState({ marital: 'married' });
    const fresh2 = bad.checkBadges();
    const dup = bad.checkBadges(); // 状态未变，不应再解锁任何徽章
    return {
      hasMarriage: fresh2.some((b: any) => b.id === 'b_marriage'),
      dupCount: dup.length,
      pendingAfter: bad.takePendingBadges(),
    };
  });
  expect(r2.hasMarriage, '已婚应解锁婚姻徽章').toBe(true);
  expect(r2.dupCount, '重复检查不应重复解锁').toBe(0);

  // —— 3) 跨 reload 持久化 ——
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
  await waitForScene(page, 'TitleScene');
  const persisted = await page.evaluate(() => {
    const { bad, col } = (window as any).__mod;
    const c = col.getCollection();
    bad.clearPendingBadgesForTest();
    return {
      hasZhuzhi: c.badges.has('b_zhuzhi'), hasMarriage: c.badges.has('b_marriage'),
      badgeTotal: c.badges.size,
    };
  });
  expect(persisted.hasZhuzhi && persisted.hasMarriage, 'reload 后徽章仍在').toBe(true);
  expect(persisted.badgeTotal, '不应有多余徽章').toBe(3);

  // —— 4) 图鉴里程碑页渲染 ——
  await page.keyboard.press('g');
  await waitForScene(page, 'CollectionScene');
  await page.keyboard.press('Tab'); // 切到里程碑页
  const rendered = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScene('CollectionScene');
    const texts = scene.children.list.filter((o: any) => o.type === 'Text').map((o: any) => o.text as string);
    return {
      tabActive: texts.some((t: string) => t.includes('生涯里程碑')),
      unlockedRow: texts.some((t: string) => t.includes('✓ 主治在手')),
      lockedRow: texts.some((t: string) => t.includes('○ 保研上岸')),
      pageHint: texts.some((t: string) => t.includes('翻页')),
    };
  });
  expect(rendered.tabActive, '里程碑页签').toBe(true);
  expect(rendered.unlockedRow, '已达成徽章应打勾显示').toBe(true);
  expect(rendered.lockedRow, '未达成徽章应显示○').toBe(true);
  expect(rendered.pageHint, '应有翻页提示').toBe(true);

  // 翻页与选择不越界
  await page.keyboard.press('ArrowRight'); // 第 2 页
  await page.keyboard.press('ArrowRight'); // 回第 1 页（回绕）
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await waitForScene(page, 'TitleScene');
});
