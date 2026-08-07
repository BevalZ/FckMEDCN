import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { advanceByEnterUntilScene } from './helpers';

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
  await advanceByEnterUntilScene(page, 'CampusScene');
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

test('医院场景新闻横幅正常弹出', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await waitForScene(page, 'TitleScene');

  // 直接以实习阶段开局（该阶段有带回声的新闻事件 m2_in_overwork_seen）
  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.patchState({ stage: 'internship', turnsInStage: 3 });
    (window as any).game.scene.getScene('TitleScene').scene.start('HospitalScene');
  });
  await waitForScene(page, 'HospitalScene');
  await page.keyboard.press('Enter'); // 关简报
  await page.waitForTimeout(400);

  // 强制打开带回声的新闻事件并选第一项
  await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('HospitalScene');
    const ev = (window as any).__mod.ev.ALL_EVENTS.find((e: any) => e.id === 'm2_in_overwork_seen');
    if (!ev) return;
    s.openEvent(ev);
  });
  await page.keyboard.press('1');
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    const scene = (window as any).game.scene.getScene('HospitalScene');
    const news = gs.getState().newsLog.map((n: any) => n.headline);
    const toast = scene.children.list
      .filter((o: any) => o.type === 'Text' && o.depth === 120)
      .map((o: any) => o.text as string);
    return {
      inLog: news.some((h: string) => h.includes('年轻医生倒下')),
      toast,
    };
  });

  expect(result.inLog, '回声头条应进入 newsLog').toBe(true);
  expect(result.toast.some((t: string) => t.startsWith('新闻 ·') && t.includes('年轻医生倒下')),
    '医院场景屏幕上方应弹出新闻横幅').toBe(true);
});

test('结婚与生子的里程碑横幅正常弹出', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await waitForScene(page, 'TitleScene');

  // 以实习阶段开局（life_marry/life_childbirth 的 stage 含 internship，医院场景可强制开事件）
  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.patchState({ stage: 'internship', turnsInStage: 3, marital: 'dating', money: 50000, hasChild: false });
    (window as any).game.scene.getScene('TitleScene').scene.start('HospitalScene');
  });
  await waitForScene(page, 'HospitalScene');
  await page.keyboard.press('Enter'); // 关简报
  await page.waitForTimeout(400);

  // 结婚：强制打开 life_marry 并选"风风光光办婚礼"
  await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('HospitalScene');
    const ev = (window as any).__mod.ev.ALL_EVENTS.find((e: any) => e.id === 'life_marry');
    if (ev) s.openEvent(ev);
  });
  await page.keyboard.press('1');
  await page.waitForTimeout(500);
  const marry = await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    const scene = (window as any).game.scene.getScene('HospitalScene');
    const news = gs.getState().newsLog.map((n: any) => n.headline);
    const toast = scene.children.list
      .filter((o: any) => o.type === 'Text' && o.depth === 120)
      .map((o: any) => o.text as string);
    return {
      inLog: news.some((h: string) => h.includes('初婚平均年龄')),
      toast,
    };
  });
  expect(marry.inLog, '结婚回声应进入 newsLog').toBe(true);
  expect(marry.toast.some((t: string) => t.startsWith('新闻 ·') && t.includes('初婚平均年龄')),
    '结婚横幅应弹出').toBe(true);

  // 生子：强制打开 life_childbirth 并选"迎接宝宝到来"
  await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('HospitalScene');
    const ev = (window as any).__mod.ev.ALL_EVENTS.find((e: any) => e.id === 'life_childbirth');
    if (ev) s.openEvent(ev);
  });
  await page.keyboard.press('1');
  await page.waitForTimeout(500);
  const child = await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    const scene = (window as any).game.scene.getScene('HospitalScene');
    const news = gs.getState().newsLog.map((n: any) => n.headline);
    const toast = scene.children.list
      .filter((o: any) => o.type === 'Text' && o.depth === 120)
      .map((o: any) => o.text as string);
    return {
      inLog: news.some((h: string) => h.includes('生育支持政策')),
      toast,
    };
  });
  expect(child.inLog, '生子回声应进入 newsLog').toBe(true);
  expect(child.toast.some((t: string) => t.startsWith('新闻 ·') && t.includes('生育支持政策')),
    '生子横幅应弹出').toBe(true);
});
