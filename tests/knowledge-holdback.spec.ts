import { test, expect } from '@playwright/test';

// 知识机制「用进废退」+ 硕博留级剧情链（计划 B）：
//  1) 本季学过（studied_q=1）→ 季度结算知识不掉
//  2) 本季没学（studied_q=0）→ 季度结算随机掉 5~10%
//  3) holdbackExtraTurns：置留级 flag → 本阶段延长 4 季（本科/硕博一致，career 不受影响）
//  4) holdbackSanityPenalty：留级未走出 → -3；走出（*_recovered）→ 0
//  5) recovery 事件存在：ms_/phd_holdback_life 置对应 *_holdback_recovered

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: import('@playwright/test').Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

async function waitForScene(page: import('@playwright/test').Page, key: string, timeout = 30000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

// —— 1) 学了不掉 ——
test('知识衰减：本季学过则季度结算不掉', async ({ page }) => {
  await boot(page);
  const res = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    gs.patchState({ stats: { ...gs.getState().stats, knowledge: 100 } });
    gs.setCounter('studied_q', 1);
    tf.advanceQuarter('master');
    return { knowledge: gs.getState().stats.knowledge, studied: gs.getCounter('studied_q') };
  });
  expect(res.knowledge, '学过则知识应保持在 100').toBe(100);
  expect(res.studied, '结算后 studied_q 应清零').toBe(0);
});

// —— 2) 不学才掉 ——
test('知识衰减：本季没学则季度结算随机掉 5~10%', async ({ page }) => {
  await boot(page);
  const res = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    gs.patchState({ stats: { ...gs.getState().stats, knowledge: 100 } });
    gs.setCounter('studied_q', 0);
    tf.advanceQuarter('master');
    return { knowledge: gs.getState().stats.knowledge };
  });
  expect(res.knowledge, '没学则知识应衰减（< 100）').toBeLessThan(100);
  expect(res.knowledge, '衰减上限约 10%').toBeGreaterThanOrEqual(90);
});

// —— 3) 留级延长学制 ——
test('留级延长：本科/硕博置留级 flag 后本阶段 +4 季，career 不受影响', async ({ page }) => {
  await boot(page);
  const res = await page.evaluate(() => {
    const { gs, kn } = (window as any).__mod;
    const none = kn.holdbackExtraTurns('master');
    gs.setFlag('ms_holdback');
    const ms = kn.holdbackExtraTurns('master');
    // 回归：本科留级同样 +4
    gs.setFlag('ug_holdback');
    const ug = kn.holdbackExtraTurns('undergrad');
    // career 不在留级体系内
    const career = kn.holdbackExtraTurns('career');
    return { none, ms, ug, career };
  });
  expect(res.none, '未留级 → 0').toBe(0);
  expect(res.ms, '硕士留级 → 4').toBe(4);
  expect(res.ug, '本科留级 → 4（回归）').toBe(4);
  expect(res.career, 'career 不受影响 → 0').toBe(0);
});

// —— 4) 留级每季心理负担 ——
test('留级心理负担：留级未走出 -3，走出后 0', async ({ page }) => {
  await boot(page);
  const res = await page.evaluate(() => {
    const { gs, kn } = (window as any).__mod;
    const before = kn.holdbackSanityPenalty('master');
    gs.setFlag('ms_holdback');
    const during = kn.holdbackSanityPenalty('master');
    gs.setFlag('ms_holdback_recovered');
    const after = kn.holdbackSanityPenalty('master');
    return { before, during, after };
  });
  expect(res.before, '未留级 → 0').toBe(0);
  expect(res.during, '留级未走出 → -3').toBe(-3);
  expect(res.after, '走出留级 → 0').toBe(0);
});

// —— 5) recovery 事件存在且能解除负担 ——
test('留级 recovery 事件：ms_/phd_holdback_life 置对应 recovered flag', async ({ page }) => {
  await boot(page);
  const res = await page.evaluate(() => {
    const { ev } = (window as any).__mod;
    const all: any[] = ev.ALL_EVENTS;
    const find = (flag: string) => {
      const e = all.find((x: any) => x.requireFlag === flag);
      const setsRecovered = e?.choices?.some((c: any) => c.flagSet && c.flagSet.endsWith('_recovered'));
      return { exists: !!e, setsRecovered };
    };
    return { ms: find('ms_holdback'), phd: find('phd_holdback') };
  });
  expect(res.ms.exists, '应存在 ms_holdback_life').toBe(true);
  expect(res.ms.setsRecovered, 'ms 事件应置 ms_holdback_recovered').toBe(true);
  expect(res.phd.exists, '应存在 phd_holdback_life').toBe(true);
  expect(res.phd.setsRecovered, 'phd 事件应置 phd_holdback_recovered').toBe(true);
});

test('留级判定隔离：本科留级 flag 不应屏蔽硕士留级', async ({ page }) => {
  await boot(page);
  await waitForScene(page, 'TitleScene');
  const res = await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.patchState({
      stage: 'master',
      turnsInStage: 1,
      stats: { ...gs.getState().stats, knowledge: 10 },
    });
    gs.setFlag('ug_holdback');
    (window as any).game.scene.getScene('TitleScene').scene.start('MasterWalkScene');
    return true;
  });
  expect(res).toBe(true);
  await waitForScene(page, 'MasterWalkScene');

  const flags = await page.evaluate(() => {
    const scene: any = (window as any).game.scene.getScene('MasterWalkScene');
    const triggered = scene.maybeExamCrisis();
    const st = (window as any).__state();
    return {
      triggered,
      ug: st.flags.has('ug_holdback'),
      ms: st.flags.has('ms_holdback'),
      phd: st.flags.has('phd_holdback'),
    };
  });

  expect(flags.triggered, '硕士低知识应触发本阶段学业警示').toBe(true);
  expect(flags.ug, '既有本科留级 flag 保留').toBe(true);
  expect(flags.ms, '硕士应独立置 ms_holdback').toBe(true);
  expect(flags.phd).toBe(false);
});
