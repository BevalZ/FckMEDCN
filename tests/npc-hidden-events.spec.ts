import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('NPC 隐藏事件：每个 NPC 都有可解析规则，且事件进入 ALL_EVENTS 但不进随机池', async ({ page }) => {
  await boot(page);

  const report = await page.evaluate(() => {
    const { npc, nh, ev } = (window as any).__mod;
    const ids = new Set(npc.NPCS.map((n: any) => n.id));
    const ruleNpcIds = new Set(nh.NPC_HIDDEN_RULES.map((r: any) => r.npcId));
    const eventIds = new Set(ev.ALL_EVENTS.map((e: any) => e.id));
    const hiddenIds = new Set(nh.NPC_HIDDEN_EVENTS.map((e: any) => e.id));

    const missingRule = [...ids].filter(id => !ruleNpcIds.has(id));
    const orphanRuleNpc = [...ruleNpcIds].filter(id => !ids.has(id));
    const missingEvent = nh.NPC_HIDDEN_RULES
      .filter((r: any) => !eventIds.has(r.eventId))
      .map((r: any) => `${r.id}->${r.eventId}`);
    const nonManual = nh.NPC_HIDDEN_EVENTS
      .filter((e: any) => e.manualOnly !== true || e.once !== true)
      .map((e: any) => e.id);
    const noAffinityGate = nh.NPC_HIDDEN_RULES
      .filter((r: any) => typeof r.minAffinity !== 'number' && typeof r.maxAffinity !== 'number')
      .map((r: any) => r.id);
    const randomPool = ev.getAvailableEvents(
      'career',
      new Set(),
      { stamina: 80, knowledge: 80, money: 5000, sanity: 80, relations: 80, reputation: 80, papers: 2, age: 35, clinical: 80, research: 80, fakeRisk: 0 },
      new Set(),
      8,
      'single',
    ).filter((e: any) => hiddenIds.has(e.id)).map((e: any) => e.id);

    return { missingRule, orphanRuleNpc, missingEvent, nonManual, noAffinityGate, randomPool };
  });

  expect(report.missingRule, `这些 NPC 没有隐藏事件规则：${report.missingRule.join(', ')}`).toEqual([]);
  expect(report.orphanRuleNpc, `这些隐藏规则引用了不存在的 NPC：${report.orphanRuleNpc.join(', ')}`).toEqual([]);
  expect(report.missingEvent, `这些隐藏规则引用了不存在的事件：${report.missingEvent.join(', ')}`).toEqual([]);
  expect(report.nonManual, `隐藏 NPC 事件必须 once + manualOnly：${report.nonManual.join(', ')}`).toEqual([]);
  expect(report.noAffinityGate, `NPC 特殊事件必须由好感阈值参与触发：${report.noAffinityGate.join(', ')}`).toEqual([]);
  expect(report.randomPool, `隐藏 NPC 事件不应进入随机池：${report.randomPool.join(', ')}`).toEqual([]);
});

test('NPC 隐藏事件：stage/spot/turn/stat/affinity/flag 条件会挡住误触发', async ({ page }) => {
  await boot(page);

  const result = await page.evaluate(() => {
    const { gs, nh } = (window as any).__mod;

    gs.resetGame();
    gs.enterStage('undergrad');
    gs.patchState({ turnsInStage: 4, affinity: { roommate: 55 }, stats: { ...gs.getState().stats, sanity: 42 } });
    const roommateHit = nh.npcHiddenEventFor({ npcId: 'roommate', stage: 'undergrad', spotId: 'dorm', firedEvents: new Set() })?.id ?? null;
    gs.patchState({ affinity: { roommate: 40 } });
    const roommateLowAffinity = nh.npcHiddenEventFor({ npcId: 'roommate', stage: 'undergrad', spotId: 'dorm', firedEvents: new Set() })?.id ?? null;
    gs.patchState({ affinity: { roommate: 55 } });
    const roommateWrongSpot = nh.npcHiddenEventFor({ npcId: 'roommate', stage: 'undergrad', spotId: 'library', firedEvents: new Set() })?.id ?? null;
    const roommateFired = nh.npcHiddenEventFor({ npcId: 'roommate', stage: 'undergrad', spotId: 'dorm', firedEvents: new Set(['npc_roommate_dorm_low_sanity']) })?.id ?? null;

    gs.resetGame();
    gs.enterStage('undergrad');
    gs.patchState({ turnsInStage: 14, affinity: { senior: 58 } });
    gs.getState().flags.add('ug_kaoyan_intent');
    const seniorHit = nh.npcHiddenEventFor({ npcId: 'senior', stage: 'undergrad', spotId: 'board', firedEvents: new Set() })?.id ?? null;
    gs.getState().flags.delete('ug_kaoyan_intent');
    const seniorNoFlag = nh.npcHiddenEventFor({ npcId: 'senior', stage: 'undergrad', spotId: 'board', firedEvents: new Set() })?.id ?? null;

    gs.resetGame();
    gs.enterStage('career');
    gs.patchState({ turnsInStage: 8, affinity: { department_chief: 60 } });
    const chiefHit = nh.npcHiddenEventFor({ npcId: 'department_chief', stage: 'career', spotId: 'admin', firedEvents: new Set() })?.id ?? null;
    gs.patchState({ affinity: { department_chief: 40 } });
    const chiefLowAffinity = nh.npcHiddenEventFor({ npcId: 'department_chief', stage: 'career', spotId: 'admin', firedEvents: new Set() })?.id ?? null;

    return { roommateHit, roommateLowAffinity, roommateWrongSpot, roommateFired, seniorHit, seniorNoFlag, chiefHit, chiefLowAffinity };
  });

  expect(result.roommateHit).toBe('npc_roommate_dorm_low_sanity');
  expect(result.roommateLowAffinity).toBeNull();
  expect(result.roommateWrongSpot).toBeNull();
  expect(result.roommateFired).toBeNull();
  expect(result.seniorHit).toBe('npc_senior_exam_window');
  expect(result.seniorNoFlag).toBeNull();
  expect(result.chiefHit).toBe('npc_department_chief_rank_list');
  expect(result.chiefLowAffinity).toBeNull();
});

test('NPC 隐藏事件：不满足隐藏规则时仍能回落到普通对话', async ({ page }) => {
  await boot(page);

  const result = await page.evaluate(() => {
    const { gs, nh, npc } = (window as any).__mod;
    gs.resetGame();
    gs.enterStage('undergrad');
    gs.patchState({ turnsInStage: 0, stats: { ...gs.getState().stats, sanity: 85 } });

    const hidden = nh.npcHiddenEventFor({ npcId: 'roommate', stage: 'undergrad', spotId: 'dorm', firedEvents: new Set() });
    const talk = npc.getTalk('roommate');
    return { hidden: hidden?.id ?? null, talkText: talk?.text ?? null, choices: talk?.choices.length ?? 0 };
  });

  expect(result.hidden).toBeNull();
  expect(result.talkText).toContain('解剖实验报告');
  expect(result.choices).toBeGreaterThan(0);
});
