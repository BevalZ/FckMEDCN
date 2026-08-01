import { test } from '@playwright/test';
import type { Page } from '@playwright/test';

// 数值平衡模拟：在真实事件池 + 真实经济模型下跑满本科 20 回合，
// 检验不同打法的体力/存款/心理曲线。用于调参，不做硬断言。

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
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await waitForScene(page, 'CampusScene');
}

test('本科 20 回合数值平衡模拟', async ({ page }) => {
  await enterCampus(page);

  const result = await page.evaluate(async () => {
    const { tf } = (window as any).__mod;
    const { cm } = (window as any).__mod;
    const { gs } = (window as any).__mod;
    const { stats: st } = (window as any).__mod;

    const spotById: Record<string, any> = {};
    for (const s of cm.CAMPUS_SPOTS) spotById[s.id] = s;

    // 固定打法：每季度选 3 个行动（storylet 只算 1 次）
    const STRATEGIES: Record<string, string[]> = {
      '贪心(自习+兼职)': ['library', 'library', 'board'],
      '均衡(事件+跑步+吃饭)': ['dorm', 'field', 'canteen'],
      '摆烂(跑步+吃饭+睡)': ['field', 'canteen', 'canteen'],
      '极限自习(全自习)': ['library', 'library', 'library'],
    };

    // 自适应打法：模拟真实玩家——体力低就休息，心理低就跑步，否则学习
    function adaptivePlan(stats: any): string[] {
      const plan: string[] = [];
      for (let i = 0; i < 3; i++) {
        if (stats.stamina < 35) plan.push('canteen');
        else if (stats.sanity < 45) plan.push('field');
        else if (stats.money < -3000) plan.push('board');
        else plan.push('library');
      }
      return plan;
    }

    const out: Record<string, any> = {};
    const ALL: Array<[string, string[] | 'adaptive']> = [
      ...Object.entries(STRATEGIES) as Array<[string, string[]]>,
      ['自适应(像真人一样按需调整)', 'adaptive'],
    ];

    for (const [name, planSpec] of ALL) {
      // 重置到本科开局
      gs.resetGame();
      gs.patchState({
        stats: st.createDefaultStats(),
        stage: 'undergrad', turnsInStage: 0, year: 2024, quarter: 3,
        school: { id: 'x', name: 'x', realHint: '', tier: 3, minScore: 0, city: 'x', bonus: {} } as any,
      });
      gs.setFlag('entry_undergrad'); // 跳过一次性入学费用（已在真实流程扣过）

      const fired = new Set<string>();
      const trace: any[] = [];
      let storyletCount = 0, crisisTurn = -1;

      for (let turn = 0; turn < 20; turn++) {
        const plan = planSpec === 'adaptive'
          ? adaptivePlan(gs.getState().stats)
          : planSpec;
        let usedStorylet = false;
        for (const spotId of plan) {
          const spot = spotById[spotId];
          // 优先领事件（每季 1 次）
          if (!usedStorylet && spot.categories.length
              && tf.hasStorylet('undergrad', fired, spot.categories)) {
            const ev = tf.drawStorylet('undergrad', fired, spot.categories);
            if (ev) {
              if (ev.once) fired.add(ev.id);
              // 模拟玩家总选第一个选项
              tf.commitChoice(ev.choices[0]);
              usedStorylet = true;
              storyletCount++;
              continue;
            }
          }
          gs.updateStats(spot.daily.delta);
        }
        // 睡觉：恢复 + 学业焦虑 + 体力透支 + 季度结算
        gs.updateStats(cm.SLEEP_RECOVER);
        const s0 = gs.getState();
        gs.updateStats({ sanity: cm.academicAnxiety(s0.turnsInStage, s0.stats.knowledge) });
        gs.updateStats({ sanity: cm.exhaustionPenalty(s0.stats.stamina) });
        tf.advanceQuarter('undergrad');

        const s = gs.getState().stats;
        if (s.sanity <= 0 && crisisTurn < 0) crisisTurn = turn;
        if (turn % 4 === 3 || turn === 19) {
          trace.push({ t: turn + 1, 体力: Math.round(s.stamina), 知识: Math.round(s.knowledge),
            存款: s.money, 心理: Math.round(s.sanity) });
        }
      }
      const f = gs.getState().stats;
      out[name] = {
        最终: { 体力: Math.round(f.stamina), 知识: Math.round(f.knowledge), 存款: f.money,
                心理: Math.round(f.sanity), 关系: Math.round(f.relations), 声望: Math.round(f.reputation) },
        领到事件数: storyletCount,
        心理归零回合: crisisTurn < 0 ? '未归零' : crisisTurn + 1,
        轨迹: trace,
      };
    }
    return out;
  });

  console.log('\n===== 本科 20 回合模拟（每种打法固定行动，事件均选第一个选项）=====');
  for (const [name, r] of Object.entries(result as any)) {
    const rr = r as any;
    console.log(`\n--- ${name} ---`);
    console.log('  最终:', JSON.stringify(rr.最终));
    console.log('  领到事件数:', rr.领到事件数, '| 心理归零:', rr.心理归零回合);
    console.log('  轨迹:', rr.轨迹.map((x: any) => `T${x.t}[体${x.体力} 知${x.知识} 钱${x.存款} 心${x.心理}]`).join(' '));
  }
});
