import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 覆盖率回归：可行走场景里每个地点在每个回合都应当有可领事件，
// 否则玩家走过去只能做日常活动，'!' 常年不亮（操场/公告栏此前就是这样）。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 120000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

async function enterCampus(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await waitForScene(page, 'CampusScene');
}

test('每个地点在本科 20 回合内都有可领事件', async ({ page }) => {
  await enterCampus(page);

  const cov = await page.evaluate(async () => {
    const { tf } = (window as any).__mod;
    const { cm } = (window as any).__mod;
    const { gs } = (window as any).__mod;

    const out: Record<string, { dryTurns: number[]; minPool: number }> = {};
    const st = gs.getState();
    const orig = st.turnsInStage;

    for (const spot of cm.CAMPUS_SPOTS) {
      const dry: number[] = [];
      let minPool = Infinity;
      for (let turn = 0; turn <= 20; turn++) {
        gs.patchState({ turnsInStage: turn });
        // 用空的 firedEvents：代表"该回合理论上可触发的事件"
        const ok = tf.hasStorylet('undergrad', new Set<string>(), spot.categories);
        if (!ok) dry.push(turn);
        // 统计池子里有多少条（用 drawStorylet 抽 40 次看去重后的种类数下限）
        const seen = new Set<string>();
        for (let i = 0; i < 40; i++) {
          const e = tf.drawStorylet('undergrad', new Set<string>(), spot.categories);
          if (e) seen.add(e.id);
        }
        minPool = Math.min(minPool, seen.size);
      }
      out[spot.id] = { dryTurns: dry, minPool };
    }
    gs.patchState({ turnsInStage: orig });
    return out;
  });

  console.log('各地点空转回合（该回合无任何可领事件）:');
  for (const [id, r] of Object.entries(cov)) {
    console.log(`  ${id.padEnd(9)} 空转回合=[${r.dryTurns.join(',')}]  单回合最少可抽种类=${r.minPool}`);
  }

  for (const [id, r] of Object.entries(cov)) {
    expect(r.dryTurns, `${id} 在这些回合完全无事件可领`).toEqual([]);
  }
});
