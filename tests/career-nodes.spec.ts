import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 职业人生节点回归：
// 1) 第 0 季强制选择亚专科（内科/外科/妇产科/儿科），flag 写入；
// 2) 第 3 季起强制第一起医患诉讼（法庭）；第 9 季第二起（仲裁）——ESC 跳过也会补上；
// 3) 管理层事件（took_admin）可达。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 120000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

const currentEventId = (page: Page) => page.evaluate(() => {
  const s: any = (window as any).game.scene.getScene('CareerScene');
  return s.currentEvent?.id ?? null;
});

async function dismissPopup(page: Page) {
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
}

test('职业期强制选亚专科 → 第3季强制医患诉讼', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await waitForScene(page, 'TitleScene');

  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.patchState({ stage: 'career', turnsInStage: 0 });
    (window as any).game.scene.getScene('TitleScene').scene.start('CareerScene');
  });
  await waitForScene(page, 'CareerScene');
  await dismissPopup(page); // 关经济简报

  // ① 第 0 季应强制亚专科选择
  await page.waitForFunction(
    () => {
      const s: any = (window as any).game.scene.getScene('CareerScene');
      return s.currentEvent?.id === 'career_specialty_choice';
    },
    null, { timeout: 15000 },
  );
  await page.keyboard.press('2'); // 选外科
  await page.waitForTimeout(500);
  const flag = await page.evaluate(() => ((window as any).__mod.gs.getState().flags.has('sub_surgery')));
  expect(flag, '选外科应写入 sub_surgery').toBe(true);
  await dismissPopup(page); // 关后果 → 进入第 1 季

  // ② 走完第 1、2 季（各一次随机事件 + 结算）
  for (let i = 0; i < 2; i++) {
    await page.waitForFunction(
      () => {
        const s: any = (window as any).game.scene.getScene('CareerScene');
        return s.currentEvent !== null && s.currentEvent.id !== 'career_specialty_choice';
      },
      null, { timeout: 15000 },
    );
    await page.keyboard.press('1'); // 选第一个选项
    await page.waitForTimeout(400);
    await dismissPopup(page); // 关后果 → 下季
  }

  // ③ 第 3 季应强制第一起医患诉讼
  await page.waitForFunction(
    () => {
      const s: any = (window as any).game.scene.getScene('CareerScene');
      return s.currentEvent?.id === 'career_lawsuit_1';
    },
    null, { timeout: 20000 },
  );
  expect(await currentEventId(page), '第3季应强制诉讼').toBe('career_lawsuit_1');
  const turns = await page.evaluate(() => ((window as any).__mod.gs.getState().turnsInStage));
  expect(turns, '应在第 3 季').toBeGreaterThanOrEqual(3);
});

test('管理层事件（took_admin）可达', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  const r = await page.evaluate(() => {
    const { ev, stats: st } = (window as any).__mod;
    const base = st.createDefaultStats();
    let hit = -1;
    for (let turn = 1; turn <= 12; turn++) {
      const pool = ev.getAvailableEvents('career', new Set(['took_admin']), { ...base }, new Set(), turn, 'single');
      if (pool.some((e: any) => e.id === 'career_admin_manage')) { hit = turn; break; }
    }
    const bare = ev.getAvailableEvents('career', new Set(), { ...base }, new Set(), 6, 'single');
    return { hit, requiresAdmin: !bare.some((e: any) => e.id === 'career_admin_manage') };
  });
  console.log('  管理层事件:', JSON.stringify(r));
  expect(r.hit, 'took_admin 时应可达').toBeGreaterThan(0);
  expect(r.requiresAdmin, '未任管理层时不可达').toBe(true);
});
