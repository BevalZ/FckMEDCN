import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// R12：实习手写事件池密度——核心 INTERNSHIP_EVENTS ≥40，轮转门控可抽。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('实习手写核心池达到 40+ 且轮转门控事件可达', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ev } = (window as any).__mod;
    const core = (ev.INTERNSHIP_EVENTS ?? []).map((e: { id: string }) => e.id);
    // 若未单独挂出，则从 ALL_EVENTS 里剔 gen_ 且排除明显跨文件前缀，保守数手写总量
    const allHand = ev.ALL_EVENTS
      .filter((e: { stage: string; id: string }) => e.stage === 'internship' && !String(e.id).startsWith('gen_'))
      .map((e: { id: string }) => e.id);

    const availableWith = (flags: string[]) => {
      gs.resetGame();
      gs.patchState({
        stage: 'internship',
        turnsInStage: 3,
        stats: { ...gs.getState().stats, stamina: 80, sanity: 60, knowledge: 40 },
      });
      for (const f of flags) gs.setFlag(f);
      return ev.getAvailableEvents(
        'internship',
        gs.getState().flags,
        gs.getState().stats,
        new Set(),
        3,
        'single',
      ).map((e: { id: string }) => e.id);
    };

    return {
      coreCount: core.length,
      handCount: allHand.length,
      hasRotSurgery: allHand.includes('intern_rot_surgery_scrub'),
      surgeryPool: availableWith(['rotation_surgery']),
      internalPool: availableWith(['rotation_internal']),
      erPool: availableWith(['rotation_er']),
      noRot: availableWith([]),
    };
  });

  // 优先认 INTERNSHIP_EVENTS；未导出时退回全阶段非生成手写数
  const counted = r.coreCount > 0 ? r.coreCount : r.handCount;
  expect(counted, '实习手写核心池应 ≥40').toBeGreaterThanOrEqual(40);
  expect(r.hasRotSurgery || r.handCount >= 40).toBe(true);
  expect(r.surgeryPool).toContain('intern_rot_surgery_scrub');
  expect(r.internalPool).toContain('intern_rot_internal_ecg');
  expect(r.erPool).toContain('intern_rot_er_triage');
  expect(r.noRot).not.toContain('intern_rot_surgery_scrub');
  expect(r.noRot).not.toContain('intern_rot_internal_ecg');
  expect(r.noRot).not.toContain('intern_rot_er_triage');
});
