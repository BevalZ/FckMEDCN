import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// M9 全生命周期平衡矩阵：三种选择倾向 x 两种地区 x 两种经济画像。
// 固定种子跑满 89 季，守住双线成长方向、地区经济差异和极端家境的可完成性。

const BASE = 'http://127.0.0.1:5173/';
const STAGE_PLAN: Array<[string, number]> = [
  ['undergrad', 20], ['internship', 5], ['guipei', 12], ['master', 12],
  ['phd', 16], ['jobhunt', 4], ['career', 20],
];

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('M9 平衡矩阵：策略成长、地区经济和极端画像保持可玩', async ({ page }) => {
  await boot(page);

  const rows = await page.evaluate((PLAN) => {
    const { gs, tf, stats: statModule, en, ec } = (window as any).__mod;
    const strategies = ['honest', 'clinical', 'research'];
    const regions = ['top', 'county'];
    const profiles = ['normal', 'tight'];

    function seedRandom(seed: number) {
      let state = seed | 0;
      Math.random = () => {
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function choiceScore(choice: any, strategy: string): number {
      const d = choice.delta ?? {};
      const s = gs.getState().stats;
      if (choice.effect?.kind === 'fake') return -10000;
      let score = (d.knowledge ?? 0) + (d.reputation ?? 0) + (d.relations ?? 0) * 0.4;
      score += (d.papers ?? 0) * (strategy === 'research' ? 8 : 4);
      score += (d.clinical ?? 0) * (strategy === 'clinical' ? 5 : 1.2);
      score += (d.research ?? 0) * (strategy === 'research' ? 5 : 1.2);
      if (strategy === 'clinical') score -= (d.research ?? 0) * 0.8;
      if (strategy === 'research') score -= (d.clinical ?? 0) * 0.8;
      score += (d.sanity ?? 0) * (s.sanity < 35 ? 3 : 0.7);
      score += (d.stamina ?? 0) * (s.stamina < 25 ? 2 : 0.25);
      score += (d.money ?? 0) / 2500;
      return score;
    }

    function runLife(strategy: string, region: string, profile: string) {
      const seed = 20260804 + strategies.indexOf(strategy) * 100
        + regions.indexOf(region) * 10 + profiles.indexOf(profile);
      seedRandom(seed);
      gs.resetGame();
      const tight = profile === 'tight';
      const attrs = tight
        ? { family: 1, academic: 4, luck: 2, looks: 3 }
        : { family: 2, academic: 3, luck: 2, looks: 3 };
      const base = statModule.createDefaultStats();
      const flags = new Set<string>();
      if (tight) flags.add('student_loan');
      flags.add(region === 'top' ? 'offer_sanjia' : 'offer_grass');
      flags.add(strategy === 'clinical' ? 'track_clinical' : 'track_research');
      gs.patchState({
        stats: {
          ...base,
          knowledge: base.knowledge + attrs.academic * 5,
          relations: base.relations + attrs.looks * 4,
          reputation: base.reputation + attrs.looks,
          sanity: base.sanity + attrs.luck * 2,
        },
        attrs,
        familyWealth: tight ? 'tight' : 'middle',
        mentorStyle: tight ? 'tight' : 'equal',
        financeStrategy: 'thrifty',
        assets: 0,
        flags,
        stage: 'undergrad', turnsInStage: 0, year: 2024, quarter: 3,
        school: { id: 'matrix', name: 'matrix', realHint: '', tier: 3, minScore: 0, city: 'x', bonus: {} },
      });

      const fired = new Set<string>();
      let careerIncome = 0;
      let careerHousing = 0;
      for (const [stage, turns] of PLAN) {
        gs.patchState({ stage, turnsInStage: 0 });
        for (let turn = 0; turn < turns; turn++) {
          const event = tf.drawStorylet(stage, fired);
          if (event?.choices.length) {
            if (event.once) fired.add(event.id);
            let best = event.choices[0];
            for (const choice of event.choices.slice(1)) {
              if (choiceScore(choice, strategy) > choiceScore(best, strategy)) best = choice;
            }
            tf.commitChoice(best, event);
          }
          const result = tf.advanceQuarter(stage);
          if (stage === 'career') {
            careerIncome += result.econ.income;
            if (gs.getState().flags.has('bought_house')) careerHousing += ec.houseMonthly();
          }
          if (gs.getState().stats.sanity < 12) gs.updateStats({ sanity: 18 });
        }
      }

      const state = gs.getState();
      const stats = state.stats;
      const rank = state.flags.has('passed_zhenggao') ? 'zhenggao'
        : state.flags.has('passed_fugao') ? 'fugao'
        : state.flags.has('passed_zhuzhi') ? 'zhuzhi' : 'resident';
      return {
        strategy, region, profile,
        money: stats.money,
        assets: state.assets ?? 0,
        wealth: stats.money + (state.assets ?? 0),
        sanity: stats.sanity,
        clinical: stats.clinical,
        research: stats.research,
        rank,
        ending: en.determineEnding(state)?.id ?? null,
        careerIncome,
        careerHousing,
      };
    }

    const result: any[] = [];
    for (const strategy of strategies) {
      for (const region of regions) {
        for (const profile of profiles) result.push(runLife(strategy, region, profile));
      }
    }
    return result;
  }, STAGE_PLAN);

  console.table(rows);
  expect(rows).toHaveLength(12);
  expect(rows.every(row => Number.isFinite(row.wealth) && row.wealth > -100000),
    '所有组合的总财富都不应出现灾难性负值').toBe(true);
  expect(rows.every(row => row.ending !== null), '所有组合都应能完成生命周期并得到结局').toBe(true);

  const average = (strategy: string, field: 'clinical' | 'research') => {
    const selected = rows.filter(row => row.strategy === strategy);
    return selected.reduce((sum, row) => sum + row[field], 0) / selected.length;
  };
  expect(average('clinical', 'clinical'), '临床策略应形成更高临床力')
    .toBeGreaterThan(average('research', 'clinical'));
  expect(average('research', 'research'), '科研策略应形成更高科研力')
    .toBeGreaterThan(average('clinical', 'research'));

  for (const strategy of ['honest', 'clinical', 'research']) {
    for (const profile of ['normal', 'tight']) {
      const top = rows.find(row => row.strategy === strategy && row.region === 'top' && row.profile === profile)!;
      const county = rows.find(row => row.strategy === strategy && row.region === 'county' && row.profile === profile)!;
      expect(top.careerIncome, `${strategy}/${profile} 三甲职业收入应高于县城`).toBeGreaterThan(county.careerIncome);
      expect(top.careerHousing, `${strategy}/${profile} 三甲房贷不应低于县城`).toBeGreaterThanOrEqual(county.careerHousing);
    }
  }
});
