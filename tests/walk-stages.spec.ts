import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// E 阶段回归：规培后做成可行走地图（硕士 / 博士 / 职业），
// 并修复「求职直接跳结局导致职业场景永久不可达」的路由 bug。
//
// 覆盖链路：
//  A) JobHuntScene.transitionToNext 现在进入 CareerWalkScene（而非 EndingScene）
//  B) 规培科研轨（track_research）→ MasterWalkScene
//  C) 规培临床轨（无 track_research）→ JobHuntScene
//  D) CareerWalkScene 读满学制 → EndingScene（结局由 determineEnding 决定）

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 30000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

/** 连打直到场景就绪（入口经济简报 / 季度账单等弹窗可能叠多层）。
 *  可行走场景用 busy 字段 + 空格解弹窗；卡片场景无 busy 字段，用回车解简报弹窗。 */
async function dismissPopups(page: Page, sceneKey: string) {
  for (let i = 0; i < 8; i++) {
    const busy = await page.evaluate((k) => (window as any).game.scene.getScene(k)?.busy, sceneKey);
    if (busy === false) return;
    // 卡片场景（busy === undefined）：用回车关掉入口经济简报
    await page.keyboard.press(busy === undefined ? 'Enter' : 'Space');
    await page.waitForTimeout(450);
  }
  const finalBusy = await page.evaluate((k) => (window as any).game.scene.getScene(k)?.busy, sceneKey);
  if (finalBusy !== false && finalBusy !== undefined) {
    throw new Error(`场景 ${sceneKey} 未能就绪（busy=${finalBusy}）`);
  }
}

/** 把玩家瞬移到睡觉点并睡觉，强制结束当前季度 */
async function sleepNow(page: Page, sceneKey: string) {
  await page.evaluate((k) => {
    const s: any = (window as any).game.scene.getScene(k);
    const spots: any[] = k === 'GuipeiWalkScene'
      ? (window as any).__mod.gm.GUIPEI_SPOTS
      : s.spots;
    const sp = spots.find((x: any) => x.sleep);
    s.actionsLeft = 0;
    const c = s.tileCenter(sp.door[0], sp.door[1]);
    s.walker.sprite.setPosition(c.x, c.y);
  }, sceneKey);
  await page.keyboard.press('e');
}

async function startScene(page: Page, key: string, stage: string, turnsInStage: number) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await waitForScene(page, 'TitleScene');
  await page.evaluate((args) => {
    const { gs } = (window as any).__mod;
    gs.patchState({ stage: args.stage, turnsInStage: args.turnsInStage });
    (window as any).game.scene.getScene('TitleScene').scene.start(args.key);
  }, { key, stage, turnsInStage });
  await waitForScene(page, key);
  await dismissPopups(page, key);
}

test('A. 求职结束进入职业可行走场景（修复永久不可达）', async ({ page }) => {
  const errors: string[] = [];
  const isEnvNoise = (s: string) => /AudioContext|audio device|WebAudio/i.test(s);
  page.on('pageerror', e => { if (!isEnvNoise(String(e))) errors.push('PAGEERROR: ' + String(e)); });
  page.on('console', m => { if (m.type() === 'error' && !isEnvNoise(m.text())) errors.push('CONSOLE: ' + m.text()); });

  // 从倒数第二季开始，只需再走完一季即达转换阈值（maxTurns=4）
  await startScene(page, 'JobHuntScene', 'jobhunt', 3);

  // 卡片场景每季弹卡，选第一项并关后果弹窗，直到离开 JobHuntScene
  for (let i = 0; i < 12; i++) {
    const still = await page.evaluate(() =>
      (window as any).game.scene.getScenes(true).some((s: any) => s.sys.settings.key === 'JobHuntScene'));
    if (!still) break;
    const hasEvent = await page.evaluate(() => {
      const s: any = (window as any).game.scene.getScene('JobHuntScene');
      return s.currentEvent != null;
    });
    if (!hasEvent) { await page.waitForTimeout(400); continue; }
    await page.keyboard.press('1');   // 选第一项
    await page.waitForTimeout(350);
    await page.keyboard.press('Enter'); // 关后果弹窗
    await page.waitForTimeout(500);
  }

  // 关键断言：应进入 CareerWalkScene，而非直接跳 EndingScene
  let reached = false;
  try {
    await waitForScene(page, 'CareerWalkScene', 20000);
    reached = true;
  } catch {
    const diag = await page.evaluate(() => ({
      scenes: (window as any).game.scene.getScenes(true).map((s: any) => s.sys.settings.key),
      turns: (window as any).__state()?.turnsInStage,
      errors: (window as any).__lastErrors ?? null,
    }));
    console.log('DIAG A:', JSON.stringify(diag), 'PAGEERRORS:', errors.join(' | '));
  }
  expect(reached, `求职后应进入 CareerWalkScene（实际场景见 DIAG）。错误：${errors.join(' | ')}`).toBe(true);

  const ended = await page.evaluate(() =>
    (window as any).game.scene.getScenes(true).some((s: any) => s.sys.settings.key === 'EndingScene'));
  expect(ended, '求职后不应直接跳结局（职业场景必须可达）').toBe(false);

  expect(errors, `运行时报错：\n${errors.join('\n')}`).toEqual([]);
});

test('B. 规培科研轨（track_research）→ 硕士可行走场景', async ({ page }) => {
  await startScene(page, 'GuipeiWalkScene', 'guipei', 11);
  await page.evaluate(() => (window as any).__setFlag('track_research'));
  await sleepNow(page, 'GuipeiWalkScene');
  await waitForScene(page, 'MasterWalkScene', 20000);
  const ok = await page.evaluate(() =>
    (window as any).game.scene.getScenes(true).some((s: any) => s.sys.settings.key === 'MasterWalkScene'));
  expect(ok, '科研轨应进入硕士可行走场景').toBe(true);
});

test('C. 规培临床轨（无 track_research）→ 求职', async ({ page }) => {
  await startScene(page, 'GuipeiWalkScene', 'guipei', 11);
  await sleepNow(page, 'GuipeiWalkScene');
  await waitForScene(page, 'JobHuntScene', 20000);
  const ok = await page.evaluate(() =>
    (window as any).game.scene.getScenes(true).some((s: any) => s.sys.settings.key === 'JobHuntScene'));
  expect(ok, '临床轨应直接进入求职（不再被强制读硕博）').toBe(true);
});

test('D. 职业可行走场景读满学制 → 结局', async ({ page }) => {
  await startScene(page, 'CareerWalkScene', 'career', 19);
  await sleepNow(page, 'CareerWalkScene');
  await waitForScene(page, 'EndingScene', 20000);
  const info = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('EndingScene');
    return { endingId: (s.scene.settings.data as any)?.endingId ?? null };
  });
  expect(info.endingId, '职业读满应进入结局并给出结局 id').toBeTruthy();
});
