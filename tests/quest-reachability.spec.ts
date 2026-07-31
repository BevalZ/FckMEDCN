import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 任务清单审计：每个"到某地做某事"的任务目标事件必须真的可达，且挂载了对应的小游戏。
// 背景：用户反馈"技能中心没有练习缝合的选项"——缝合事件混在大池里随机抽取，
// 玩家按任务清单去技能中心却长期抽不到（已修复：技能中心优先出缝合）。
// 本回归守住其余同类任务（CPR/夜班/执业医）不再犯同样的错。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === 'TitleScene'),
    null, { timeout: 60000 },
  );
}

test('任务目标事件可达且小游戏配置正确', async ({ page }) => {
  await boot(page);

  const report = await page.evaluate(() => {
    const { ev, stats: st } = (window as any).__mod;
    const base = st.createDefaultStats();

    // [任务清单 label, 阶段, 目标事件, 应挂小游戏, 事件最低回合]
    const CASES: Array<[string, string, string, string, number]> = [
      ['技能中心练缝合', 'undergrad', 'clinical_skills_lab', 'suture', 3],
      ['练习 CPR 技能', 'internship', 'first_cpr', 'cpr', 2],
      ['值一次夜班', 'internship', 'first_night_shift', 'nightshift', 1],
      ['考取执业医师', 'guipei', 'licensure_exam', 'exam', 3],
    ];

    return CASES.map(([label, stage, id, minigame, minTurn]) => {
      let firstHit = -1;
      for (let turn = 1; turn <= 20; turn++) {
        const pool = ev.getAvailableEvents(stage, new Set(), { ...base }, new Set(), turn, 'single');
        if (pool.some((e: any) => e.id === id)) { firstHit = turn; break; }
      }
      const e = ev.ALL_EVENTS.find((x: any) => x.id === id);
      return {
        label, id,
        eventMinigame: e?.minigame ?? null,
        eventMinTurn: e?.minTurn ?? 1,
        firstHit,
        ok: firstHit > 0 && firstHit >= (e?.minTurn ?? 1) && (e?.minigame ?? null) === minigame,
      };
    });
  });

  for (const r of report) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.label}（${r.id}）：首次可达第 ${r.firstHit} 回合 · 小游戏 ${r.eventMinigame}`);
    expect(r.ok, `${r.label}（${r.id}）不可达或小游戏配置不符`).toBe(true);
  }
});
