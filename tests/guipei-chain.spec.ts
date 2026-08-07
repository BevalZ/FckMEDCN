import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { advanceByEnterUntilScene } from './helpers';

// B7 回归：规培可行走场景的链式事件即时续接（此前 handleChoice 没有 resolveChained，
// nextEventId 被静默丢弃，见 docs/known-issues.md B7）。
// 验证 m2_gp_tonggang「跟教学部反映」→ 立即续接 m2_gp_tonggang_reply，
// 且链上禁 ESC（B3 语义）、整链只扣 1 行动点。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 20000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

/** 空格连打直到场景就绪（入口经济简报/季度账单等弹窗可能叠多层） */
async function dismissPopups(page: Page, sceneKey: string) {
  for (let i = 0; i < 6; i++) {
    const busy = await page.evaluate(
      (k) => (window as any).game.scene.getScene(k)?.busy,
      sceneKey,
    );
    if (busy === false) return;
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
  }
  await page.waitForFunction(
    (k) => (window as any).game.scene.getScene(k).busy === false,
    sceneKey, { timeout: 8000 },
  );
}

test('B7 规培链：同岗同酬选项即时续接教学部回复', async ({ page }) => {
  const errors: string[] = [];
  const isEnvNoise = (s: string) => /AudioContext|audio device|WebAudio/i.test(s);
  page.on('pageerror', e => { if (!isEnvNoise(String(e))) errors.push('PAGEERROR: ' + String(e)); });
  page.on('console', m => {
    if (m.type() === 'error' && !isEnvNoise(m.text())) errors.push('CONSOLE: ' + m.text());
  });

  // —— 进入校园 ——
  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene', 120000);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 20000 });
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  await advanceByEnterUntilScene(page, 'CampusScene');
  await waitForScene(page, 'CampusScene');
  await dismissPopups(page, 'CampusScene');

  // —— 跳到本科最后一季睡觉 → 实习医院 ——
  await page.evaluate(() => {
    // 盲选 Gaokao 默认本博连读 8 年制 → 路由 PhdWalkScene；清掉长学制标记走正常实习医院路径。
    const f = (window as any).__state().flags;
    f.delete('track_eight_year');
    f.delete('long_system');
    (window as any).__patchState({ turnsInStage: 19 });
    (window as any).game.scene.getScene('CampusScene').actionsLeft = 0;
  });
  await page.keyboard.press('e');
  await waitForScene(page, 'HospitalScene', 30000);
  await page.waitForTimeout(800);
  await dismissPopups(page, 'HospitalScene');

  // —— 跳到实习最后一季，传送到值班室（医院睡觉点）睡觉 → 规培可行走场景 ——
  // （医院出生点在办公室门口，原地按 E 不是睡觉点，只会提示"回宿舍睡觉"；
  //   实习 MAX_TURNS=5，patch 到 4 睡一觉即达转换阈值）
  await page.evaluate(() => {
    (window as any).__patchState({ turnsInStage: 4 });
    const s: any = (window as any).game.scene.getScene('HospitalScene');
    s.actionsLeft = 0;
    const callroom = (window as any).__mod.hm.HOSPITAL_SPOTS.find((sp: any) => sp.sleep);
    const c = s.tileCenter(callroom.door[0], callroom.door[1]);
    s.walker.sprite.setPosition(c.x, c.y);
  });
  await page.waitForTimeout(300);
  await page.keyboard.press('e');
  await waitForScene(page, 'GuipeiWalkScene', 30000);
  await page.waitForTimeout(800);
  await dismissPopups(page, 'GuipeiWalkScene');

  const before = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('GuipeiWalkScene');
    return { actionsLeft: s.actionsLeft, busy: s.busy };
  });
  expect(before.busy).toBe(false);

  // —— 直接打开规培链根事件「同岗同酬传闻」——
  const opened = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('GuipeiWalkScene');
    const ev = (window as any).__mod.ev.ALL_EVENTS.find((e: any) => e.id === 'm2_gp_tonggang');
    if (!ev) return null;
    s.openEvent(ev);
    return { busy: s.busy };
  });
  expect(opened, '应存在 m2_gp_tonggang').toBeTruthy();

  // 选第 1 项「跟教学部反映」→ 关后果弹窗 → 应立即续接「教学部的回复」
  await page.keyboard.press('1');
  await page.waitForTimeout(600);
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => {
      const s: any = (window as any).game.scene.getScene('GuipeiWalkScene');
      return s.busy === true && s.currentEvent?.id === 'm2_gp_tonggang_reply';
    },
    null, { timeout: 8000 },
  );

  // 链上 ESC 不应关闭（B3 语义）
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const afterEsc = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('GuipeiWalkScene');
    return { busy: s.busy, currentId: s.currentEvent?.id ?? null };
  });
  expect(afterEsc.busy, '链式卡 ESC 不该关闭').toBe(true);
  expect(afterEsc.currentId).toBe('m2_gp_tonggang_reply');

  // 选第 1 项完成链 → 关后果弹窗 → 场景恢复
  await page.keyboard.press('1');
  await page.waitForTimeout(600);
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => (window as any).game.scene.getScene('GuipeiWalkScene').busy === false,
    null, { timeout: 8000 },
  );

  const after = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('GuipeiWalkScene');
    return {
      actionsLeft: s.actionsLeft,
      storyletUsed: s.storyletUsed,
      root: s.firedEvents.has('m2_gp_tonggang'),
      linked: s.firedEvents.has('m2_gp_tonggang_reply'),
      flagAsked: (window as any).__state().flags.has('gp_asked'),
      flagNo: (window as any).__state().flags.has('gp_tonggang_no'),
    };
  });
  expect(after.actionsLeft, '整条链只应扣 1 行动点').toBe(before.actionsLeft - 1);
  expect(after.storyletUsed).toBe(true);
  expect(after.root, '根事件 once 标记应保留').toBe(true);
  expect(after.linked, '链事件 once 标记应保留').toBe(true);
  expect(after.flagAsked, '根选项 flagSet 应生效').toBe(true);
  expect(after.flagNo, '链选项 flagSet 应生效').toBe(true);

  expect(errors, `运行时报错：\n${errors.join('\n')}`).toEqual([]);
});
