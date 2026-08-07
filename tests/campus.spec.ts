import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { advanceByEnterUntilScene } from './helpers';

// CampusScene 冒烟测试：验证可行走切片的核心闭环在真实浏览器里跑得通。
// 通过 window.game（Phaser.Game 实例，仅 DEV 构建暴露）读取场景内部状态，
// 避免依赖像素比对。
//
// 注意：Phaser 3.90 的 SceneManager.isActive() 返回 null（它读的 settings.active
// 已不再维护），故一律用 getScenes(true) 判断当前活动场景。

const BASE = 'http://127.0.0.1:5173/';

function activeScene(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    ((window as any).game?.scene?.getScenes(true) ?? []).map((s: any) => s.sys.settings.key),
  );
}

async function waitForScene(page: Page, key: string, timeout = 20000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

function campusState(page: Page) {
  return page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    const st = (window as any).__state();
    return {
      x: s.walker.x, y: s.walker.y,
      actionsLeft: s.actionsLeft,
      storyletUsed: s.storyletUsed,
      busy: s.busy,
      turnsInStage: st.turnsInStage,
      stamina: st.stats.stamina,
      quarter: st.quarter,
    };
  });
}

/** 走完高考流程进入 CampusScene */
async function enterCampus(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  // 首次访问时 Vite 需现场转译 Phaser（~1.4MB），冷启动可能明显慢于后续用例
  await waitForScene(page, 'TitleScene', 120000);
  // 清掉上一次运行留下的存档，保证每个用例都是全新开局
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');

  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');

  // 分数 → 放榜 → 选校 → 选学制 → 确认：每步都取焦点项
  await advanceByEnterUntilScene(page, 'CampusScene');
  await waitForScene(page, 'CampusScene');
}

test('CampusScene: 进入、行走、交互、睡觉推进季度', async ({ page }) => {
  const errors: string[] = [];
  // 无头环境没有真实声卡，AudioContext 的设备报错与游戏逻辑无关，需排除
  const isEnvNoise = (s: string) => /AudioContext|audio device|WebAudio/i.test(s);
  page.on('pageerror', e => { if (!isEnvNoise(String(e))) errors.push('PAGEERROR: ' + String(e)); });
  page.on('console', m => {
    if (m.type() === 'error' && !isEnvNoise(m.text())) errors.push('CONSOLE: ' + m.text());
  });

  await enterCampus(page);
  expect(await activeScene(page)).toContain('CampusScene');

  // 首次进入有经济简报弹窗，空格关闭
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => (window as any).game.scene.getScene('CampusScene').busy === false,
    null, { timeout: 10000 },
  );

  const start = await campusState(page);
  expect(start.actionsLeft).toBe(3);
  expect(start.storyletUsed).toBe(false);

  // 1) 行走：角色坐标应发生变化，且被地图边界/建筑限制在场内
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(200);
  const moved = await campusState(page);
  expect(Math.abs(moved.x - start.x)).toBeGreaterThan(20);
  expect(moved.x).toBeGreaterThan(0);
  expect(moved.x).toBeLessThan(960);

  // 2) 回到宿舍门口（出生点）
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(250);

  // 确保站在宿舍门口交互点上（NPC 可能略微挡位，测试里直接吸附）
  await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    const dorm = s.prompt?./* no */ null;
    void dorm;
    // 出生点即宿舍门口
    const spawn = (window as any).__mod?.cm?.CAMPUS_SPAWN ?? [6, 8];
    const c = s.tileCenter(spawn[0], spawn[1]);
    s.walker.sprite.setPosition(c.x, c.y);
  });
  await page.waitForTimeout(100);

  // 3) 按 E 交互：应当开事件卡，或直接消耗行动点（也可能是 NPC 对话——同样 busy）
  await page.keyboard.press('e');
  await page.waitForTimeout(700);
  const afterE = await campusState(page);
  const didSomething = afterE.busy || afterE.actionsLeft < start.actionsLeft;
  expect(didSomething, '按 E 后既没开卡也没消耗行动点').toBeTruthy();

  // 若开了事件卡/对话/小游戏结果卡，选第一个选项并关掉后果弹窗
  if (afterE.busy) {
    await page.keyboard.press('1');
    await page.waitForTimeout(600);
    await page.keyboard.press('Space');
    await page.waitForTimeout(800);
    const afterChoice = await campusState(page);
    expect(afterChoice.actionsLeft).toBeLessThan(start.actionsLeft);
    // storyletUsed 仅在领 storylet 时为 true；NPC 对话不占额度，故不强制
  }

  expect(errors, `运行时报错：\n${errors.join('\n')}`).toEqual([]);
});

test('CampusScene: 耗尽行动点后睡觉推进季度', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e)));

  await enterCampus(page);
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => (window as any).game.scene.getScene('CampusScene').busy === false,
    null, { timeout: 10000 },
  );

  const before = await campusState(page);

  // 直接把行动点清零，再在宿舍门口睡觉（避免依赖具体地图路径）
  await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    s.actionsLeft = 0;
    s.refreshInfoBar();
  });
  await page.keyboard.press('e');

  // 睡觉后回合数 +1，行动点重置
  await page.waitForFunction(
    (t) => (window as any).__state().turnsInStage > t,
    before.turnsInStage, { timeout: 10000 },
  );
  await page.waitForTimeout(700);

  const after = await campusState(page);
  expect(after.turnsInStage).toBe(before.turnsInStage + 1);
  expect(after.actionsLeft).toBe(3);
  expect(after.storyletUsed).toBe(false);
  expect(after.busy).toBe(false);

  expect(errors, `运行时报错：\n${errors.join('\n')}`).toEqual([]);
});
