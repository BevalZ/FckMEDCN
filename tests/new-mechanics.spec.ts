import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 新机制针对性测试（计划 §6）：
//  1) 体力归零 → 倦怠（跳过一季 + 体力回到 ~50）
//  2) 硕士入学知识 = 本科结束值 × 0.3（继承）
//  3) 知识 < 25 → 睡眠后触发留级 flag
//  4) 秘密 spot trySpecialEvent 触发论文事件且 fakeRisk 上升
//  5) 保研：knowledge<90 → 落选分支；knowledge≥90 → 置 baoyan
//  6) 长学制（track_eight_year）本科结束路由到 PhdWalkScene
//  7) 长学制高考分数门槛 / 中途下车 / 转轨路由

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

async function startGaokao(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => (window as any).game.scene.getScene('TitleScene').scene.start('GaokaoScene'));
  await waitForScene(page, 'GaokaoScene');
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
  expect(result.stamina, '倦怠后体力应至少回到恢复阈值').toBeGreaterThanOrEqual(50);
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

test('长学制门槛：分数不足时八年制不可选并显示要求', async ({ page }) => {
  await startGaokao(page);

  const result = await page.evaluate(() => {
    const gs = (window as any).__mod.gs;
    const scene: any = (window as any).game.scene.getScene('GaokaoScene');
    const school = { id: 'jilin', name: '鸡林大学白球恩医学部', realHint: '', tier: 1, minScore: 610, city: '长春', bonus: {} };
    scene.selectedScore = 620;
    scene.selectedSchool = school;
    gs.patchState({ score: 620, era0: { ...gs.getState().era0, ruralOriented: false } });
    scene.showTrackPhase();
    const before = scene.selectedTrack?.id ?? null;
    scene.choose(0);
    return {
      before,
      after: scene.selectedTrack?.id ?? null,
      options: scene.options.map((o: any) => ({ label: o.label, sub: o.sub, disabled: o.disabled })),
    };
  });

  const eightYear = result.options.find((o: any) => o.label.includes('八年制'));
  expect(eightYear?.disabled, '620 分不应能选择八年制').toBe(true);
  expect(eightYear?.sub, '禁用项应展示具体分数要求').toContain('要求高考分数 >= 650 分');
  expect(result.after, '点击禁用项不应写入 selectedTrack').toBe(result.before);
});

test('长学制门槛：最终确认也拒绝绕过 UI 的非法八年制', async ({ page }) => {
  await startGaokao(page);

  const result = await page.evaluate(() => {
    const gs = (window as any).__mod.gs;
    const scene: any = (window as any).game.scene.getScene('GaokaoScene');
    scene.selectedScore = 620;
    scene.selectedSchool = { id: 'jilin', name: '鸡林大学白球恩医学部', realHint: '', tier: 1, minScore: 610, city: '长春', bonus: {} };
    scene.selectedTrack = { id: 'eight_year', name: '八年制本博连读', desc: '顶尖院校才有，毕业即博士', totalYears: 8, requiresTier: 1, pros: [], cons: [] };
    gs.patchState({ score: 620, era0: { ...gs.getState().era0, ruralOriented: false } });

    scene.confirmAndTransition();
    const st = gs.getState();
    return {
      selectedTrack: scene.selectedTrack?.id ?? null,
      track: st.track,
      degree: st.degree,
      eight: st.flags.has('track_eight_year'),
      longSystem: st.flags.has('long_system'),
      activeGaokao: (window as any).game.scene.getScenes(true).some((s: any) => s.sys.settings.key === 'GaokaoScene'),
    };
  });

  expect(result.selectedTrack, '非法八年制应被清掉，回到学制选择').toBeNull();
  expect(result.track, '非法确认不应写入主路线').toBeNull();
  expect(result.degree).toBe('bachelor');
  expect(result.eight).toBe(false);
  expect(result.longSystem).toBe(false);
  expect(result.activeGaokao).toBe(true);
});

test('普通五年制入学不应预设为科研轨', async ({ page }) => {
  await startGaokao(page);

  const flags = await page.evaluate(() => {
    const scene: any = (window as any).game.scene.getScene('GaokaoScene');
    scene.selectedScore = 560;
    scene.selectedSchool = { id: 'guilin', name: '鬼林医学院', realHint: '', tier: 3, minScore: 560, city: '桂林', bonus: {} };
    scene.selectedTrack = { id: 'five_year', name: '五年制普通本科', desc: '最常见', totalYears: 5, requiresTier: 4, pros: [], cons: [] };
    scene.confirmAndTransition();
    const st = (window as any).__state();
    return {
      fiveYear: st.flags.has('track_five_year'),
      clinical: st.flags.has('track_clinical'),
      research: st.flags.has('track_research'),
      longSystem: st.flags.has('long_system'),
    };
  });

  expect(flags.fiveYear).toBe(true);
  expect(flags.clinical, '普通五年制不应在入学时预设临床硕博轨').toBe(false);
  expect(flags.research, '普通五年制不应在入学时预设科研轨').toBe(false);
  expect(flags.longSystem).toBe(false);
});

test('规培轨道选择互斥：临床选择会清掉科研轨', async ({ page }) => {
  await startWalk(page, 'GuipeiWalkScene', 'guipei', 6);

  const result = await page.evaluate(() => {
    const { gs, tf, ev } = (window as any).__mod;
    const event = ev.ALL_EVENTS.find((e: any) => e.id === 'research_vs_clinical');
    tf.commitChoice(event.choices[0], event);
    const afterResearch = {
      research: gs.getState().flags.has('track_research'),
      clinical: gs.getState().flags.has('track_clinical'),
    };
    tf.commitChoice(event.choices[1], event);
    const afterClinical = {
      research: gs.getState().flags.has('track_research'),
      clinical: gs.getState().flags.has('track_clinical'),
    };
    return { afterResearch, afterClinical };
  });

  expect(result.afterResearch).toEqual({ research: true, clinical: false });
  expect(result.afterClinical).toEqual({ research: false, clinical: true });
});

test('长学制下车：清理直通轨道并保留知识、临床能力和进度', async ({ page }) => {
  await startWalk(page, 'CampusScene', 'undergrad', 10);

  const result = await page.evaluate(() => {
    const { gs, tf, ev } = (window as any).__mod;
    gs.patchState({
      track: 'eight_year',
      degree: 'phd',
      turnsInStage: 10,
      stats: { ...gs.getState().stats, knowledge: 72, clinical: 31 },
    });
    gs.setFlag('long_system');
    gs.setFlag('track_eight_year');
    gs.setFlag('baoyan');
    const event = ev.ALL_EVENTS.find((e: any) => e.id === 'long_sys_step_down');
    tf.commitChoice(event.choices[0], event);
    const st = gs.getState();
    return {
      track: st.track,
      degree: st.degree,
      turns: st.turnsInStage,
      knowledge: st.stats.knowledge,
      clinical: st.stats.clinical,
      counters: st.counters,
      flags: {
        transferred: st.flags.has('long_sys_transferred'),
        fromUndergrad: st.flags.has('long_sys_transferred_from_undergrad'),
        longSystem: st.flags.has('long_system'),
        eight: st.flags.has('track_eight_year'),
        baoyan: st.flags.has('baoyan'),
        fiveYear: st.flags.has('track_five_year'),
        clinicalTrack: st.flags.has('track_clinical'),
      },
    };
  });

  expect(result.track).toBe('five_year');
  expect(result.degree).toBe('bachelor');
  expect(result.turns, '下车不应清空本科进度').toBe(10);
  expect(result.knowledge, '下车应保留已获得知识').toBe(72);
  expect(result.clinical, '下车应保留已获得临床能力').toBe(31);
  expect(result.counters.long_sys_transfer_turns).toBe(10);
  expect(result.counters.long_sys_transfer_knowledge).toBe(72);
  expect(result.counters.long_sys_transfer_clinical).toBe(31);
  expect(result.flags).toEqual({
    transferred: true,
    fromUndergrad: true,
    longSystem: false,
    eight: false,
    baoyan: false,
    fiveYear: true,
    clinicalTrack: true,
  });
});

test('长学制下车路由：本科结束转入实习/规培路线', async ({ page }) => {
  await startWalk(page, 'CampusScene', 'undergrad', 19);
  await page.evaluate(() => {
    const gs = (window as any).__mod.gs;
    gs.setFlag('track_eight_year');
    gs.setFlag('long_sys_transferred');
  });

  await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    s.transitionToNext();
  });
  await waitForScene(page, 'HospitalScene', 20000);
  const ok = await page.evaluate(() =>
    (window as any).game.scene.getScenes(true).some((s: any) => s.sys.settings.key === 'HospitalScene'));
  expect(ok, '长学制已下车时本科结束应进入实习场景，而不是直博/直硕').toBe(true);
});

test('长学制下车路由：硕士阶段结束进入求职', async ({ page }) => {
  await startWalk(page, 'MasterWalkScene', 'master', 11);
  await page.evaluate(() => {
    const gs = (window as any).__mod.gs;
    gs.setFlag('long_sys_transferred');
  });

  await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('MasterWalkScene');
    s.transitionToNext();
  });
  await waitForScene(page, 'JobHuntScene', 20000);
  const ok = await page.evaluate(() =>
    (window as any).game.scene.getScenes(true).some((s: any) => s.sys.settings.key === 'JobHuntScene'));
  expect(ok, '长学制已下车时硕士结束应进入求职，而不是继续读博').toBe(true);
});
