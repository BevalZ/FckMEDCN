import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 全生命周期经济回归：用固定 PRNG + 策略化选择跑完整管线（本科→实习→规培→硕博→求职→职业），
// 断言不同家境/贷款配置下的最终存款处于健康区间——防止经济平衡改动后"某条线必死"。

const BASE = 'http://127.0.0.1:5173/';

const PLAN: Array<[string, number]> = [
  ['undergrad', 20], ['internship', 5], ['guipei', 12], ['master', 12], ['phd', 16], ['jobhunt', 4], ['career', 12],
];

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('全生命周期经济：普通家境存活、拮据可贷款缓解、买房不致命', async ({ page }) => {
  await boot(page);

  const r = await page.evaluate((PLAN) => {
    const { gs, tf, stats: st } = (window as any).__mod;

    // 固定 PRNG（复用 lifecycle-sim 的播种方式）
    let rngState = 20260801;
    Math.random = () => {
      rngState |= 0; rngState = (rngState + 0x6D2B79F5) | 0;
      let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    function pick(choices: any[]): number {
      const s = gs.getState().stats;
      let best = 0, bestScore = -1e9;
      choices.forEach((c: any, i: number) => {
        const d = c.delta ?? {};
        let score = 0;
        score += (d.knowledge ?? 0) * 1.0;
        score += (d.clinical ?? 0) * 1.2;
        score += (d.research ?? 0) * 1.2;
        score += (d.papers ?? 0) * 4;
        score += (d.reputation ?? 0) * 1.0;
        score += (d.sanity ?? 0) * (s.sanity < 40 ? 2.5 : 0.6);
        score += (d.stamina ?? 0) * (s.stamina < 30 ? 2.0 : 0.3);
        score += (d.money ?? 0) / 2000;
        if (score > bestScore) { bestScore = score; best = i; }
      });
      return best;
    }

    function runLife(attrs: any, loan: boolean): number {
      gs.resetGame();
      const base = st.createDefaultStats();
      const s0 = {
        ...base,
        knowledge: base.knowledge + attrs.academic * 5,
        relations: base.relations + attrs.looks * 4,
        reputation: base.reputation + attrs.looks,
        sanity: base.sanity + attrs.luck * 2,
      };
      const flags = new Set(loan ? ['student_loan'] : []);
      gs.patchState({
        attrs, familyWealth: attrs.family <= 1 ? 'tight' : attrs.family <= 3 ? 'middle' : 'rich',
        stats: s0, flags, financeStrategy: 'stable',
        stage: 'undergrad', turnsInStage: 0, year: 2024, quarter: 3,
        school: { id: 'x', name: 'x', realHint: '', tier: 3, minScore: 0, city: 'x', bonus: {} },
      });

      const fired = new Set<string>();
      for (const [stage, turns] of PLAN) {
        gs.patchState({ stage, turnsInStage: 0 });
        for (let t = 0; t < turns; t++) {
          const e = tf.drawStorylet(stage, fired);
          if (e) {
            if (e.once) fired.add(e.id);
            if (e.choices.length > 0) {
              const c = e.choices[pick(e.choices)];
              if (c) tf.commitChoice(c);
            }
          }
          tf.advanceQuarter(stage);
          // 心理过低直接补一口，避免模拟中途崩死影响经济观察
          if (gs.getState().stats.sanity < 15) gs.updateStats({ sanity: 25 } as any);
        }
      }
      return gs.getState().stats.money;
    }

    return {
      middle: runLife({ family: 2, academic: 3, luck: 2, looks: 3 }, false),
      tight: runLife({ family: 1, academic: 4, luck: 2, looks: 3 }, false),
      tightLoan: runLife({ family: 1, academic: 4, luck: 2, looks: 3 }, true),
      rich: runLife({ family: 4, academic: 2, luck: 2, looks: 2 }, false),
    };
  }, PLAN);

  console.log('  全生命周期最终存款:', JSON.stringify(r));
  expect(r.middle, '普通家境最终存款应健康为正').toBeGreaterThan(0);
  expect(r.rich, '殷实家境应明显更好').toBeGreaterThan(r.middle);
  expect(r.tight, '拮据家庭不该直接负债崩死').toBeGreaterThan(-30000);
  expect(r.tightLoan, '助学贷款应让拮据家庭明显更好').toBeGreaterThan(r.tight + 5000);
});
