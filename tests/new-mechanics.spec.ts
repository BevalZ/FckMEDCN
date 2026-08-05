import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 新机制针对性测试（计划 §6）：
//  1) 体力归零 → 倦怠（跳过一季 + 体力回到 ~50）
//  2) 硕士入学知识 = 本科结束值 × 0.3（继承）
//  3) 知识 < 25 → 睡眠后触发留级 flag
//  4) 秘密 spot trySpecialEvent 触发论文事件且 fakeRisk 上升
//  5) 保研：knowledge<90 → 落选分支；knowledge≥90 → 置 baoyan
//  6) 长学制（track_eight_year）本科结束路由到 PhdWalkScene

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 30000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

async function waitBusyFalse(page: Page, key: string, timeout = 15000) {
  await page.waitForFunction(
    (k) => (window as any).game.scene.getScene(k)?.busy === false,
    key, { timeout },
  );
}

/** 关掉可行走场景的弹窗（空格）直到 busy=false */
async function dismissBusy(page: Page, key: string) {
  for (let i = 0; i < 8; i++) {
    const busy = await page.evaluate((k) => (window as any).game.scene.getScene(k)?.busy, key);
    if (busy === false) return;
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);
  }
}

/** 直接调用场景的 sleep()（CampusScene / WalkStageScene 均有，且不需要 s.spots）。 */
async function forceSleep(page: Page, key: string) {
  await page.evaluate((k) => {
    const s: any = (window as any).game.scene.getScene(k);
    s.sleep();
  }, key);
  await dismissBusy(page, key);
}

/** 触发秘密 spot（CampusScene 不设 s.spots，直接以最小对象调用 trySpecialEvent） */
async function openSecretSpot(page: Page, key: string): Promise<boolean> {
  return page.evaluate((k) => {
    const s: any = (window as any).game.scene.getScene(k);
    const ev = s.trySpecialEvent({ id: 'secret_lab' });
    if (!ev) return false;
    s.openEvent(ev); // trySpecialEvent 只返回事件，需 openEvent 才会设置 currentEvent
    return (window as any).game.scene.getScene(k).currentEvent?.id === 'paper_blackmarket';
  }, key);
}

async function startWalk(page: Page, key: string, stage: string, turnsInStage: number) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await waitForScene(page, 'TitleScene');
  await page.evaluate((args) => {
    const { gs } = (window as any).__mod;
    gs.patchState({ stage: args.stage, turnsInStage: args.turnsInStage, counters: {} });
    (window as any).game.scene.getScene('TitleScene').scene.start(args.key);
  }, { key, stage, turnsInStage });
  await waitForScene(page, key);
  await dismissBusy(page, key);
}

// —— 1) 倦怠 ——
test('倦怠：体力归零 → 跳过一季 + 体力回到 50', async ({ page }) => {
  await startWalk(page, 'CampusScene', 'undergrad', 0);

  const result = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    const gs = (window as any).__mod.gs;
    // 直接把体力设为 0（patchState 精确赋值，updateStats 是累加）
    gs.patchState({ stats: { ...gs.getState().stats, stamina: 0 } });
    const q0 = gs.getState().quarter;
    const triggered = s.maybeBurnout();
    return { triggered, stamina: gs.getState().stats.stamina, q0, q1: gs.getState().quarter };
  });

  expect(result.triggered, '体力归零应触发倦怠').toBe(true);
  expect(result.stamina, '倦怠后应回血到 50').toBe(50);
  // 季度推进（advanceTurn 在 4→1 时跨年，故用取模判断）
  const expected = result.q0 === 4 ? 1 : result.q0 + 1;
  expect(result.q1, '倦怠应跳过一季（季度推进）').toBe(expected);
});

// —— 2) 知识继承 ×30% ——
test('知识继承：硕士入学知识 = 本科结束值 × 0.3', async ({ page }) => {
  await startWalk(page, 'MasterWalkScene', 'master', 0);

  const inh = await page.evaluate(() => {
    const gs = (window as any).__mod.gs;
    gs.patchState({ stats: { ...gs.getState().stats, knowledge: 100 } });
    const st: any = gs.getState();
    st.flags.delete('entry_master'); // 清守护，确保继承逻辑可再次执行
    (window as any).__mod.ec.applyStageEntry('master');
    return gs.getState().stats.knowledge;
  });

  expect(inh, '知识应被重置为上阶的 30%').toBe(30);
});

// —— 3) 知识过低 → 留级 ——
test('考试危机：本科知识 < 25 → 睡眠后触发 ug_holdback', async ({ page }) => {
  await startWalk(page, 'CampusScene', 'undergrad', 1);

  await page.evaluate(() => {
    const gs = (window as any).__mod.gs;
    gs.patchState({ stats: { ...gs.getState().stats, knowledge: 10 } }); // 低于 LOW_KNOWLEDGE=25
  });
  await forceSleep(page, 'CampusScene');

  const held = await page.evaluate(() => (window as any).__state().flags.has('ug_holdback'));
  expect(held, '知识过低睡眠后应被留级').toBe(true);
});

// —— 4) 秘密 spot 论文黑市 + fakeRisk ——
test('秘密地点：触发论文黑市且 fakeRisk 上升', async ({ page }) => {
  await startWalk(page, 'CampusScene', 'undergrad', 1);

  const opened = await openSecretSpot(page, 'CampusScene');
  expect(opened, 'secret_lab 应触发 paper_blackmarket').toBe(true);

  // 选"买一篇二作"（effect fake:moderate → +18），确认 fakeRisk 上升
  const risk = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    const before = (window as any).__state().stats.fakeRisk;
    s.handleChoice(s.currentEvent.choices[0], 0);
    return { before, after: (window as any).__state().stats.fakeRisk };
  });
  expect(risk.after, '买论文后 fakeRisk 应上升').toBeGreaterThan(risk.before);
});

// —— 5) 保研门槛 ——
test('保研门槛：knowledge≥90 才能置 baoyan（<90 落选分支可见）', async ({ page }) => {
  await startWalk(page, 'CampusScene', 'undergrad', 12);

  // 5a) 知识不足（精确设为 80）→ 成功选项被隐藏
  const low = await page.evaluate(() => {
    const gs = (window as any).__mod.gs;
    gs.patchState({ stats: { ...gs.getState().stats, knowledge: 80 } });
    const ev = (window as any).__mod.ev.ALL_EVENTS.find((e: any) => e.id === 'ug_baoyan_result');
    const visible = ev.choices.filter((c: any) => (window as any).__mod.ev.choiceVisible(c));
    return { visibleTexts: visible.map((c: any) => c.text) };
  });
  expect(low.visibleTexts, 'knowledge<90 时成功选项应被隐藏').not.toContain('你在名单里');

  // 5b) 知识达标（精确设为 95）→ 成功选项可见
  const high = await page.evaluate(() => {
    const gs = (window as any).__mod.gs;
    gs.patchState({ stats: { ...gs.getState().stats, knowledge: 95 } });
    const ev = (window as any).__mod.ev.ALL_EVENTS.find((e: any) => e.id === 'ug_baoyan_result');
    const visible = ev.choices.filter((c: any) => (window as any).__mod.ev.choiceVisible(c));
    return { visibleTexts: visible.map((c: any) => c.text) };
  });
  expect(high.visibleTexts, 'knowledge≥90 时成功选项应可见').toContain('你在名单里');
});

// —— 6) 长学制路由 ——
test('分轨：track_eight_year 本科结束路由到 PhdWalkScene', async ({ page }) => {
  await startWalk(page, 'CampusScene', 'undergrad', 19);
  await page.evaluate(() => (window as any).__setFlag('track_eight_year'));

  await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    s.transitionToNext();
  });
  await waitForScene(page, 'PhdWalkScene', 20000);
  const ok = await page.evaluate(() =>
    (window as any).game.scene.getScenes(true).some((s: any) => s.sys.settings.key === 'PhdWalkScene'));
  expect(ok, '本博连读应直博，跳过硕士').toBe(true);
});

// —— 6b) 保研路由（补充）：baoyan 本科结束路由到 MasterWalkScene ——
test('分轨：baoyan 本科结束路由到 MasterWalkScene', async ({ page }) => {
  await startWalk(page, 'CampusScene', 'undergrad', 19);
  await page.evaluate(() => (window as any).__setFlag('baoyan'));

  await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    s.transitionToNext();
  });
  await waitForScene(page, 'MasterWalkScene', 20000);
  const ok = await page.evaluate(() =>
    (window as any).game.scene.getScenes(true).some((s: any) => s.sys.settings.key === 'MasterWalkScene'));
  expect(ok, '保研上岸应进科研硕士').toBe(true);
});
