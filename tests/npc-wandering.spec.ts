import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

test('NPC 使用短名牌并在可行走区域内逐格巡游', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((scene: any) => scene.sys.settings.key === 'TitleScene'),
    null,
    { timeout: 60000 },
  );

  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.patchState({ stage: 'undergrad', year: 2024, quarter: 3, turnsInStage: 0 });
    (window as any).game.scene.getScene('TitleScene').scene.start('CampusScene');
  });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((scene: any) => scene.sys.settings.key === 'CampusScene'),
    null,
    { timeout: 60000 },
  );
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => ((window as any).game.scene.getScene('CampusScene') as any).npcs.length > 0,
    null,
    { timeout: 10000 },
  );

  const initial = await page.evaluate(() => {
    const scene: any = (window as any).game.scene.getScene('CampusScene');
    return {
      positions: scene.npcs.map((npc: any) => ({ id: npc.def.id, x: npc.x, y: npc.y })),
      labels: scene.npcs.map((npc: any) => npc.plate.text as string),
    };
  });
  await page.waitForTimeout(4500);

  const result = await page.evaluate((before) => {
    const scene: any = (window as any).game.scene.getScene('CampusScene');
    const moved = scene.npcs.filter((npc: any) => {
      const start = before.find((item: any) => item.id === npc.def.id);
      return start && (Math.abs(npc.x - start.x) > 1 || Math.abs(npc.y - start.y) > 1);
    }).length;
    const invalidTiles = scene.npcs.flatMap((npc: any) => {
      const roam = npc.roam;
      const tiles = [{ col: npc.roamCol, row: npc.roamRow }, ...(npc.target ? [npc.target] : [])];
      return tiles
        .filter((tile: any) => roam.isBlocked(tile.col, tile.row)
          || Math.abs(tile.col - roam.anchorCol) > 2
          || Math.abs(tile.row - roam.anchorRow) > 2)
        .map((tile: any) => `${npc.def.id}@${tile.col},${tile.row}`);
    });

    scene.setBusy(true);
    return {
      npcCount: scene.npcs.length,
      moved,
      invalidTiles,
      pausePositions: scene.npcs.map((npc: any) => ({ x: npc.x, y: npc.y })),
    };
  }, initial.positions);
  await page.waitForTimeout(1200);
  const pausedMoved = await page.evaluate((positions) => {
    const scene: any = (window as any).game.scene.getScene('CampusScene');
    return scene.npcs.some((npc: any, index: number) =>
      npc.x !== positions[index].x || npc.y !== positions[index].y);
  }, result.pausePositions);

  expect(result.npcCount).toBeGreaterThan(0);
  expect(initial.labels.every((label: string) => Array.from(label).length <= 3 && !label.includes('·'))).toBe(true);
  expect(result.moved, '至少应有一个 NPC 在巡游').toBeGreaterThan(0);
  expect(result.invalidTiles).toEqual([]);
  expect(pausedMoved, '事件或对话打开时 NPC 应停止移动').toBe(false);
});
