import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// A4 回归：技能中心真实存在且能练缝合（用户报告"没有技能中心"）。
// 三根支柱：① 地图上有 skills 交互点、门口可行走；② 缝合事件 clinical_skills_lab
// 在技能中心分类池里确实可抽到（此前混在教学楼大池，等于任务指向一个没有的地方）；
// ③ 行为级：走到技能中心门口按 E 能交互。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 20000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

test('A4 技能中心：地点存在、缝合事件可抽、门口可交互', async ({ page }) => {
  const errors: string[] = [];
  const isEnvNoise = (s: string) => /AudioContext|audio device|WebAudio|Framebuffer/i.test(s);
  page.on('pageerror', e => { if (!isEnvNoise(String(e))) errors.push('PAGEERROR: ' + String(e)); });

  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene', 120000);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 20000 });

  // ① 数据层：skills 交互点存在、门口非实心、分类含 clinical
  const spotInfo = await page.evaluate(() => {
    const { cm, tm } = (window as any).__mod;
    const spot = cm.CAMPUS_SPOTS.find((s: any) => s.id === 'skills');
    if (!spot) return null;
    const isSolid = tm.makeIsSolid(cm.CAMPUS_SPEC);
    return {
      label: spot.label,
      categories: [...spot.categories],
      doorSolid: isSolid(spot.door[0], spot.door[1]),
    };
  });
  expect(spotInfo, 'CAMPUS_SPOTS 应有 skills 交互点').toBeTruthy();
  expect(spotInfo!.label).toBe('技能中心');
  expect(spotInfo!.doorSolid, '技能中心门口必须可行走').toBe(false);
  expect(spotInfo!.categories).toContain('clinical');

  // ② 缝合事件在技能中心分类池里可抽到（minTurn=3，把回合拨到第 4 季）
  const suture = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    gs.patchState({ turnsInStage: 4 });
    const fired = new Set<string>();
    let hit: { id: string; minigame: string | null } | null = null;
    for (let i = 0; i < 200 && !hit; i++) {
      const ev = tf.drawStorylet('undergrad', fired, ['clinical', 'study']);
      if (ev?.id === 'clinical_skills_lab') hit = { id: ev.id, minigame: ev.minigame ?? null };
    }
    return hit;
  });
  expect(suture, '技能中心分类池 200 次抽取内应能命中缝合事件').toBeTruthy();
  expect(suture!.minigame, '缝合事件应挂缝合小游戏').toBe('suture');

  // ③ 行为级：进校园，传送到技能中心门口按 E，应能交互（开卡或消耗行动点）
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await waitForScene(page, 'CampusScene');
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => (window as any).game.scene.getScene('CampusScene').busy === false,
    null, { timeout: 10000 },
  );

  await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    const { cm } = (window as any).__mod;
    const spot = cm.CAMPUS_SPOTS.find((sp: any) => sp.id === 'skills');
    const c = s.tileCenter(spot.door[0], spot.door[1]);
    s.walker.sprite.setPosition(c.x, c.y);
  });
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    return { actionsLeft: s.actionsLeft, busy: s.busy };
  });
  await page.keyboard.press('e');
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    return { actionsLeft: s.actionsLeft, busy: s.busy };
  });
  const didSomething = after.busy || after.actionsLeft < before.actionsLeft;
  expect(didSomething, '技能中心门口按 E 应开卡或消耗行动点').toBeTruthy();

  // 收尾：若开了卡，ESC 退掉保持干净
  if (after.busy) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  expect(errors, `运行时报错：\n${errors.join('\n')}`).toEqual([]);
});
