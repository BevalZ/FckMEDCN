import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 120000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

async function campusState(page: Page) {
  return page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    return { x: Math.round(s.walker.x), y: Math.round(s.walker.y), actionsLeft: s.actionsLeft, storyletUsed: s.storyletUsed, busy: s.busy, turnsInStage: (window as any).__state().turnsInStage };
  });
}

test('HospitalScene: 从校园过渡到实习医院', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e)));

  // 进入游戏
  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene', 120000);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await waitForScene(page, 'CampusScene');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => (window as any).game.scene.getScene('CampusScene').busy === false, null, { timeout: 10000 });

  // 直接跳到最后一季，然后睡觉推进到实习
  await page.evaluate(() => {
    // 盲选 Gaokao 默认落在第一个志愿（本博连读 8 年制），会路由到 PhdWalkScene；
    // 这里清掉长学制路由标记，让本科结束正常进入实习医院场景。
    const f = (window as any).__state().flags;
    f.delete('track_eight_year');
    f.delete('long_system');
    (window as any).__patchState({ turnsInStage: 19 });
    const s: any = (window as any).game.scene.getScene('CampusScene');
    s.actionsLeft = 0;
  });
  await page.keyboard.press('e');
  await page.waitForTimeout(500);

  // 应该进入实习医院
  const hospital = await page.waitForFunction(
    () => (window as any).game?.scene?.getScenes(true)?.some((s: any) => s.sys.settings.key === 'HospitalScene'),
    null, { timeout: 30000 },
  );
  expect(hospital).toBeTruthy();

  await page.waitForTimeout(500);
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);

  // 检查医院场景状态
  const hState = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('HospitalScene');
    return s ? { exists: true, actionsLeft: s.actionsLeft, busy: s.busy } : { exists: false };
  });
  console.log('医院场景状态:', JSON.stringify(hState));
  expect(hState.exists).toBe(true);
  expect(hState.actionsLeft).toBe(3);

  // 走动
  const start = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('HospitalScene');
    return { x: Math.round(s.walker.x), y: Math.round(s.walker.y) };
  });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(200);
  const moved = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('HospitalScene');
    return { x: Math.round(s.walker.x), y: Math.round(s.walker.y) };
  });
  expect(Math.abs(moved.x - start.x)).toBeGreaterThan(20);
  console.log('行走:', JSON.stringify({ start, moved }));

  expect(errors, `运行时报错：\n${errors.join('\n')}`).toEqual([]);
});

test('HospitalScene: 地图渲染与交互点', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/AudioContext|audio device|WebAudio/i.test(m.text())) errors.push('CONSOLE: ' + m.text()); });

  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene', 120000);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await waitForScene(page, 'CampusScene');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => (window as any).game.scene.getScene('CampusScene').busy === false, null, { timeout: 10000 });

  // 跳转到实习
  await page.evaluate(() => {
    // 盲选 Gaokao 默认落在第一个志愿（本博连读 8 年制），会路由到 PhdWalkScene；
    // 这里清掉长学制路由标记，让本科结束正常进入实习医院场景。
    const f = (window as any).__state().flags;
    f.delete('track_eight_year');
    f.delete('long_system');
    (window as any).__patchState({ turnsInStage: 19 });
    const s: any = (window as any).game.scene.getScene('CampusScene');
    s.actionsLeft = 0;
  });
  await page.keyboard.press('e');
  await page.waitForFunction(() => (window as any).game?.scene?.getScenes(true)?.some((s: any) => s.sys.settings.key === 'HospitalScene'), null, { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);

  // 检查 tilemap 是否正确渲染
  const mapCheck = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('HospitalScene');
    const mapImg = s.children.list.find((c: any) => c?.texture?.key === 'hospital_map');
    // HOSPITAL_SPOTS 是模块常量，从 hospitalMap（挂在 __mod.hm）读取
    const spots = (window as any).__mod?.hm?.HOSPITAL_SPOTS ?? [];
    return {
      mapExists: !!mapImg,
      mapX: mapImg?.x ?? -1,
      mapY: mapImg?.y ?? -1,
      walkerExists: !!s.walker,
      spotsCount: spots.length,
    };
  });
  console.log('地图检查:', JSON.stringify(mapCheck));
  expect(mapCheck.mapExists).toBe(true);
  expect(mapCheck.walkerExists).toBe(true);
  expect(mapCheck.spotsCount).toBeGreaterThan(0);

  expect(errors, `运行时报错：\n${errors.join('\n')}`).toEqual([]);
});