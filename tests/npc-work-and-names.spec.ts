import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
});

test('NPC姓名在同一存档稳定，新档重新生成且职业原型事件可达', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { gs, npc, ev, stats } = (window as any).__mod;
    gs.resetGame();
    const first = { ...gs.getState().npcNames };
    const sameSave = { ...gs.getState().npcNames };
    gs.resetGame();
    const second = { ...gs.getState().npcNames };
    const careerEvents = ev.getAvailableEvents('career', new Set(), stats.createDefaultStats(), new Set(), 3, 'single')
      .filter((event: any) => event.id.startsWith('work_npc_')).length;
    const roles = npc.NPCS.filter((def: any) => def.stages.includes('career')).length;
    const npcIds = npc.NPCS.map((def: any) => def.id);
    const missingGeneratedName = npcIds.filter((id: string) => !second[id]);
    const longDisplayNames = npcIds.filter((id: string) => Array.from(npc.getNpcDisplayName(id)).length > 3);
    return {
      stable: JSON.stringify(first) === JSON.stringify(sameSave),
      changed: JSON.stringify(first) !== JSON.stringify(second),
      careerEvents,
      roles,
      npcCount: npcIds.length,
      missingGeneratedName,
      longDisplayNames,
    };
  });
  expect(result.stable).toBe(true);
  expect(result.changed).toBe(true);
  expect(result.careerEvents).toBeGreaterThanOrEqual(12);
  expect(result.roles).toBeGreaterThanOrEqual(1);
  expect(result.npcCount).toBeGreaterThanOrEqual(60);
  expect(result.missingGeneratedName, `这些 NPC 没有随存档生成姓名：${result.missingGeneratedName.join(', ')}`).toEqual([]);
  expect(result.longDisplayNames, `这些 NPC 的地图名牌仍然过长：${result.longDisplayNames.join(', ')}`).toEqual([]);
});
