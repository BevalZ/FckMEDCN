import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { advanceByEnterUntilScene } from './helpers';

// 新增事件的可达性检查：确认它们真能在本科 20 季内被抽到，
// 而不是因为 requireStat / requireFlag / minTurn 配错而永远沉底。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 120000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

test('新增本科事件均可达', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  await advanceByEnterUntilScene(page, 'CampusScene');
  await waitForScene(page, 'CampusScene');

  const report = await page.evaluate(async () => {
    const { ev } = (window as any).__mod;
    const { gs } = (window as any).__mod;

    // 待检查的新增事件（链式子事件由父事件的 nextEventId 强制触发，单独标注）
    const ROOTS = [
      'ug_guojiang_apply', 'ug_baoyan_race', 'ug_fake_paper', 'ug_whistleblow',
      'ug_bullying', 'ug_witness_bullying', 'ug_academic_probation', 'ug_dropout_decision',
    ];
    const CHAINED = [
      'ug_guojiang_dispute', 'ug_guojiang_result', 'ug_baoyan_result',
      'ug_whistleblow_after', 'ug_bullying_after', 'ug_holdback_life',
    ];

    const st = gs.getState();
    const reachable: Record<string, number[]> = {};

    // 扫描：在不同回合 + 不同属性状态下，各 root 事件是否进入候选池
    const PROFILES = [
      { name: '学霸', knowledge: 80, sanity: 70 },
      { name: '普通', knowledge: 50, sanity: 50 },
      { name: '学渣', knowledge: 25, sanity: 30 },
    ];

    for (const id of ROOTS) {
      const hits: number[] = [];
      for (const p of PROFILES) {
        for (let turn = 0; turn <= 24; turn++) {
          const stats = { ...st.stats, knowledge: p.knowledge, sanity: p.sanity };
          const pool = ev.getAvailableEvents(
            'undergrad', st.flags, stats as any, new Set<string>(), turn, st.marital,
          );
          if (pool.some((e: any) => e.id === id)) { hits.push(turn); break; }
        }
      }
      reachable[id] = hits;
    }

    // 链式事件：只检查确实存在于 ALL_EVENTS（由 nextEventId 强制触发，不进随机池）
    const allIds = new Set(ev.ALL_EVENTS.map((e: any) => e.id));
    const chainMissing = CHAINED.filter(id => !allIds.has(id));

    return { reachable, chainMissing };
  });

  console.log('各新增根事件在哪些画像下可达（数字=首次可达回合）:');
  for (const [id, hits] of Object.entries(report.reachable as Record<string, number[]>)) {
    console.log(`  ${id.padEnd(26)} ${hits.length ? `可达(${hits.length}/3 画像)` : '*** 不可达 ***'}`);
  }

  expect(report.chainMissing, '链式子事件缺失').toEqual([]);
  for (const [id, hits] of Object.entries(report.reachable as Record<string, number[]>)) {
    expect(hits.length, `${id} 在任何画像/回合下都进不了候选池`).toBeGreaterThan(0);
  }
});
