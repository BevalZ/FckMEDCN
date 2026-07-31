import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 新闻回声行为回归：里程碑事件选择后，头条进入 newsLog 且屏幕上方弹出醒目横幅（防玩家错过）。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 120000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

test('里程碑事件选择后新闻入 log 并弹横幅', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await waitForScene(page, 'CampusScene');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  // 强制打开奖学金事件并选"认真准备材料去争"
  await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    const ev = (window as any).__mod.ev.ALL_EVENTS.find((e: any) => e.id === 'ug_scholarship_notice');
    s.openEvent(ev);
  });
  await page.keyboard.press('1');
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    const scene = (window as any).game.scene.getScene('CampusScene');
    const news = gs.getState().newsLog.map((n: any) => n.headline);
    const toast = scene.children.list
      .filter((o: any) => o.type === 'Text' && o.depth === 120)
      .map((o: any) => o.text as string);
    return {
      inLog: news.some((h: string) => h.includes('奖学金评审季')),
      tickerFirst: scene.news?.text?.text ?? '',
      toast,
    };
  });

  expect(result.inLog, '回声头条应进入 newsLog').toBe(true);
  expect(result.tickerFirst.includes('奖学金评审季'), '底部新闻栏应优先显示回声头条').toBe(true);
  expect(result.toast.some((t: string) => t.startsWith('新闻 ·') && t.includes('奖学金评审季')),
    '屏幕上方应弹出新闻横幅').toBe(true);
});
