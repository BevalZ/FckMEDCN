import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 人生图鉴回归：
// 1) recordEnding 收录与去重、runs 累计、跨 reload 持久化；
// 2) 与单局存档 key 隔离（clearSave 不影响图鉴）；
// 3) 标题 →(G 键)→ 图鉴 →(ESC)→ 标题 的场景往返，及未解锁/已解锁渲染差异。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 30000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

test('人生图鉴：收录持久化 + 场景往返 + 解锁渲染', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
  await waitForScene(page, 'TitleScene');

  // —— 1) 收录、去重、runs 累计、存档 key 隔离 ——
  const r1 = await page.evaluate(() => {
    const { col } = (window as any).__mod;
    col.resetCollectionForTest();
    const first = col.recordEnding('stable_at_45');
    const dup = col.recordEnding('stable_at_45');
    const other = col.recordEnding('master_clinician');
    return {
      first, dup, other,
      collectionKeySet: localStorage.getItem('fckmedcn_collection_v1') !== null,
      saveKeyIsolated: localStorage.getItem('fckmedcn_save_v1') === null,
    };
  });
  expect(r1.first.isNew, '首次收录应 isNew').toBe(true);
  expect(r1.dup.isNew, '重复收录不应 isNew').toBe(false);
  expect(r1.dup.runs, 'runs 应累计').toBe(2);
  expect(r1.other.unlocked, '两种结局后 unlocked=2').toBe(2);
  expect(r1.collectionKeySet, '图鉴 key 应已写入').toBe(true);
  expect(r1.saveKeyIsolated, '单局存档 key 不应被图鉴触碰').toBe(true);

  // —— 2) 跨 reload 持久化 ——
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
  await waitForScene(page, 'TitleScene');
  const persisted = await page.evaluate(() => {
    const { col, en } = (window as any).__mod;
    const c = col.getCollection();
    return { has45: c.endings.has('stable_at_45'), hasMaster: c.endings.has('master_clinician'), runs: c.runs, total: c.total, expected: en.ENDINGS.length };
  });
  expect(persisted.has45 && persisted.hasMaster, 'reload 后图鉴仍在').toBe(true);
  expect(persisted.runs, 'reload 后 runs 保留（3 次收录调用）').toBe(3);
  expect(persisted.total, '结局总数应与 ENDINGS 一致').toBe(persisted.expected);

  // —— 3) 场景往返与渲染 ——
  await page.keyboard.press('g');
  await waitForScene(page, 'CollectionScene');
  const rendered = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScene('CollectionScene');
    // 选到第一个未解锁结局，详情应出现渐进线索
    const { en, col } = (window as any).__mod;
    const lockedIdx = en.ENDINGS.findIndex((e: any) => !col.getCollection().endings.has(e.id));
    if (lockedIdx >= 0) {
      scene.selEnding = lockedIdx;
      scene.refreshList();
      scene.refreshDetail();
    }
    const texts = scene.children.list.filter((o: any) => o.type === 'Text').map((o: any) => o.text as string);
    return {
      hasHeader: texts.some((t: string) => t.includes('人生图鉴')),
      hasProgress: texts.some((t: string) => /已解锁 2 \/ \d+/.test(t)),
      hasLocked: texts.some((t: string) => t.includes('？？？')),
      hasUnlockedTitle: texts.some((t: string) => t.includes('45岁的稳定')),
      hasHint: texts.some((t: string) => t.includes('线索：')),
      lockedIdx,
    };
  });
  expect(rendered.lockedIdx, '应存在未解锁结局').toBeGreaterThanOrEqual(0);
  expect(rendered.hasHeader, '图鉴标题').toBe(true);
  expect(rendered.hasProgress, '进度行').toBe(true);
  expect(rendered.hasLocked, '未解锁应显示？？？').toBe(true);
  expect(rendered.hasUnlockedTitle, '已解锁应显示结局标题').toBe(true);
  expect(rendered.hasHint, '未解锁详情应有线索分级').toBe(true);

  // 键盘导航不报错（选中移到最后一项再越界回绕）
  for (let i = 0; i < 14; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');

  await page.keyboard.press('Escape');
  await waitForScene(page, 'TitleScene');
});
