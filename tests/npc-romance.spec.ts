import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('NPC 性别与年龄差决定是否具备异性亲密关系资格', async ({ page }) => {
  await boot(page);

  const result = await page.evaluate(() => {
    const { gs, npc } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ gender: 'male', affinity: { attending: 80, headnurse: 80, roommate: 80 } });
    const malePlayer = {
      attendingOpposite: npc.isOppositeSexNpc('attending'),
      attendingGap: npc.npcAgeGap('attending'),
      attendingEligible: npc.canStartNpcRomance('attending'),
      headnurseGap: npc.npcAgeGap('headnurse'),
      headnurseEligible: npc.canStartNpcRomance('headnurse'),
      roommateOpposite: npc.isOppositeSexNpc('roommate'),
      roommateEligible: npc.canStartNpcRomance('roommate'),
    };

    gs.resetGame();
    gs.patchState({ gender: 'female', affinity: { senior: 80 } });
    const femalePlayer = {
      seniorOpposite: npc.isOppositeSexNpc('senior'),
      seniorGap: npc.npcAgeGap('senior'),
      seniorEligible: npc.canStartNpcRomance('senior'),
    };
    return { malePlayer, femalePlayer };
  });

  expect(result.malePlayer.attendingOpposite).toBe(true);
  expect(result.malePlayer.attendingGap).toBe(8);
  expect(result.malePlayer.attendingEligible).toBe(true);
  expect(result.malePlayer.headnurseGap).toBe(12);
  expect(result.malePlayer.headnurseEligible).toBe(false);
  expect(result.malePlayer.roommateOpposite).toBe(false);
  expect(result.malePlayer.roommateEligible).toBe(false);
  expect(result.femalePlayer.seniorOpposite).toBe(true);
  expect(result.femalePlayer.seniorGap).toBe(2);
  expect(result.femalePlayer.seniorEligible).toBe(true);
});

test('NPC 高好感会优先触发异性亲密关系事件，低好感或非单身不触发', async ({ page }) => {
  await boot(page);

  const result = await page.evaluate(() => {
    const { gs, nh } = (window as any).__mod;
    gs.resetGame();
    gs.enterStage('internship');
    gs.patchState({ gender: 'male', turnsInStage: 2, affinity: { attending: 78 } });
    const hit = nh.npcHiddenEventFor({ npcId: 'attending', stage: 'internship', spotId: 'ward', firedEvents: new Set() })?.id ?? null;

    gs.patchState({ affinity: { attending: 77 } });
    const lowAffinity = nh.npcHiddenEventFor({ npcId: 'attending', stage: 'internship', spotId: 'ward', firedEvents: new Set() })?.id ?? null;

    gs.patchState({ affinity: { attending: 80 }, marital: 'married', spouse: '其他人' });
    const married = nh.npcHiddenEventFor({ npcId: 'attending', stage: 'internship', spotId: 'ward', firedEvents: new Set() })?.id ?? null;

    gs.resetGame();
    gs.enterStage('internship');
    gs.patchState({ gender: 'female', turnsInStage: 2, affinity: { attending: 80 } });
    const sameSex = nh.npcHiddenEventFor({ npcId: 'attending', stage: 'internship', spotId: 'ward', firedEvents: new Set() })?.id ?? null;

    return { hit, lowAffinity, married, sameSex };
  });

  expect(result.hit).toBe('npc_romance_start_attending');
  expect(result.lowAffinity).not.toBe('npc_romance_start_attending');
  expect(result.married).not.toBe('npc_romance_start_attending');
  expect(result.sameSex).not.toBe('npc_romance_start_attending');
});

test('NPC 亲密关系持续足够久后会进入后续阶段地图', async ({ page }) => {
  await boot(page);

  const result = await page.evaluate(() => {
    const { gs, dating, npc } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ gender: 'male' });
    dating.startNpcRomance('fellow');
    const before = npc.npcsForStage('career').some((n: any) => n.id === 'fellow');
    const ticks = Array.from({ length: npc.NPC_ROMANCE_SUSTAINED_QUARTERS }, () => dating.tickNpcRomanceQuarter('guipei'));
    const after = npc.npcsForStage('career').find((n: any) => n.id === 'fellow');
    return {
      before,
      after: Boolean(after),
      schedule: after?.schedule ?? [],
      sustained: gs.hasFlag('npc_romance_sustained_fellow'),
      duration: gs.getState().counters.npc_romance_duration_fellow,
      lastTickSustained: ticks[ticks.length - 1]?.sustainedNow ?? false,
    };
  });

  expect(result.before).toBe(false);
  expect(result.sustained).toBe(true);
  expect(result.duration).toBe(8);
  expect(result.lastTickSustained).toBe(true);
  expect(result.after).toBe(true);
  expect(result.schedule).toEqual(['ward', 'canteen', 'nurse', 'rest']);
});

