import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 全生命周期平衡矩阵：三种选择倾向 x 两种地区 x 两种经济画像。
// 路线由 trainingTrack 的真实路由函数决定；退出/危机立即终止，完整路线走完晚年三阶段。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('M9 平衡矩阵：真实路由、终止原因和完整生命周期保持一致', async ({ page }) => {
  await boot(page);

  const rows = await page.evaluate(() => {
    const { gs, tf, stats: statModule, en, ec, tr } = (window as any).__mod;
    const strategies = ['honest', 'clinical', 'research'];
    const regions = ['top', 'county'];
    const profiles = ['normal', 'tight'];
    const stageTurns: Record<string, number> = {
      undergrad: 20,
      internship: 5,
      guipei: 12,
      master: 12,
      phd: 16,
      jobhunt: 4,
      career: 20,
      pinnacle: 8,
      retirement: 8,
      eternity: 12,
    };
    const sceneStage: Record<string, string> = {
      HospitalScene: 'internship',
      InternshipScene: 'internship',
      MasterWalkScene: 'master',
      MasterScene: 'master',
      PhdWalkScene: 'phd',
      PhDScene: 'phd',
      JobHuntScene: 'jobhunt',
    };

    function seedRandom(seed: number) {
      let state = seed | 0;
      Math.random = () => {
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function exitsMedicine(choice: any): boolean {
      return /left_med|left_undergrad|no_college/.test(JSON.stringify(choice));
    }

    function choiceScore(choice: any, strategy: string): number {
      if (exitsMedicine(choice)) return -100000;
      const delta = choice.delta ?? {};
      const current = gs.getState().stats;
      if (choice.effect?.kind === 'fake') return -10000;
      let score = (delta.knowledge ?? 0) + (delta.reputation ?? 0) + (delta.relations ?? 0) * 0.4;
      score += (delta.papers ?? 0) * (strategy === 'research' ? 8 : 4);
      score += (delta.clinical ?? 0) * (strategy === 'clinical' ? 5 : 1.2);
      score += (delta.research ?? 0) * (strategy === 'research' ? 5 : 1.2);
      if (strategy === 'clinical') score -= (delta.research ?? 0) * 0.8;
      if (strategy === 'research') score -= (delta.clinical ?? 0) * 0.8;
      score += (delta.sanity ?? 0) * (current.sanity < 35 ? 3 : 0.7);
      score += (delta.stamina ?? 0) * (current.stamina < 25 ? 2 : 0.25);
      score += (delta.money ?? 0) / 2500;
      return score;
    }

    function terminal(stage: string, atBoundary = false): { reason: string; ending: string } | null {
      const state = gs.getState();
      if (state.flags.has('left_undergrad') || state.flags.has('left_med') || state.flags.has('no_college')) {
        return { reason: 'exit', ending: en.determineEnding(state).id };
      }
      if (state.stats.sanity <= 0) return { reason: 'crisis', ending: 'mental_crisis' };
      if (atBoundary && state.flags.has('considering_quit_guipei') && state.stats.sanity < 25) {
        return { reason: 'exit', ending: en.determineEnding(state).id };
      }
      return null;
    }

    function nextStage(stage: string): string | null {
      if (stage === 'undergrad') return sceneStage[tr.nextSceneAfterUndergrad('walk')];
      if (stage === 'internship') return 'guipei';
      if (stage === 'guipei') return sceneStage[tr.nextSceneAfterGuipei('walk')];
      if (stage === 'master') return sceneStage[tr.nextSceneAfterMaster('walk')];
      if (stage === 'phd') return 'jobhunt';
      if (stage === 'jobhunt') return 'career';
      if (stage === 'career') return 'pinnacle';
      if (stage === 'pinnacle') return 'retirement';
      if (stage === 'retirement') return 'eternity';
      return null;
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
      flags.add(strategy === 'research' ? 'track_research' : 'track_clinical');
      if (strategy === 'research') flags.add('phd_admitted');
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
        stage: 'gaokao',
        turnsInStage: 0,
        year: 2024,
        quarter: 3,
        school: { id: 'matrix', name: 'matrix', realHint: '', tier: 3, minScore: 0, city: 'x', bonus: {} },
      });

      const fired = new Set<string>();
      const route: string[] = [];
      let stage: string | null = 'undergrad';
      let careerIncome = 0;
      let careerHousing = 0;
      let quarters = 0;
      let timelineConsistent = true;
      let stop: { reason: string; ending: string } | null = null;
      const birthYear = gs.getState().year - gs.getState().stats.age;

      while (stage) {
        gs.enterStage(stage);
        route.push(stage);
        timelineConsistent &&= gs.getState().year - gs.getState().stats.age === birthYear;
        for (let turn = 0; turn < stageTurns[stage]; turn++) {
          const event = tf.drawStorylet(stage, fired);
          if (event?.choices.length) {
            if (event.once) fired.add(event.id);
            let best = event.choices[0];
            for (const choice of event.choices.slice(1)) {
              if (choiceScore(choice, strategy) > choiceScore(best, strategy)) best = choice;
            }
            tf.commitChoice(best, event);
            stop = terminal(stage);
            if (stop) break;
          }
          const result = tf.advanceQuarter(stage);
          quarters++;
          timelineConsistent &&= gs.getState().year - gs.getState().stats.age === birthYear;
          if (stage === 'career') {
            careerIncome += result.econ.income;
            if (gs.getState().flags.has('bought_house')) careerHousing += ec.houseMonthly();
          }
          stop = terminal(stage);
          if (stop) break;
        }
        if (stop) break;
        stop = terminal(stage, true);
        if (stop) break;
        stage = nextStage(stage);
      }

      const state = gs.getState();
      const completed = stop === null;
      const ending = stop ? stop.ending : en.determineEnding(state).id;
      const rank = state.flags.has('passed_zhenggao') ? 'zhenggao'
        : state.flags.has('passed_fugao') ? 'fugao'
          : state.flags.has('passed_zhuzhi') ? 'zhuzhi' : 'resident';
      return {
        strategy,
        region,
        profile,
        route,
        finalStage: state.stage,
        terminalReason: stop?.reason ?? 'completed',
        quarters,
        timelineConsistent,
        money: state.stats.money,
        assets: state.assets ?? 0,
        wealth: state.stats.money + (state.assets ?? 0),
        sanity: state.stats.sanity,
        clinical: state.stats.clinical,
        research: state.stats.research,
        rank,
        ending,
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
  });

  console.table(rows);
  expect(rows).toHaveLength(12);
  expect(rows.every(row => row.timelineConsistent), '所有路线的年龄/年份必须保持同一出生年份').toBe(true);
  expect(rows.every(row => Number.isFinite(row.wealth) && row.wealth > -100000),
    '所有组合的总财富都不应出现灾难性负值').toBe(true);

  const earlyEndings = new Set(['left_undergrad', 'quit_guipei', 'worker_steady', 'worker_struggle']);
  const lateEndings = new Set(['great_healer', 'inheritor', 'ordinary_road', 'unfinished_life', 'final_rest', 'meteor_life']);
  for (const row of rows) {
    if (row.terminalReason === 'completed') {
      expect(row.route.at(-1), `${row.strategy}/${row.region}/${row.profile} 应走到永恒阶段`).toBe('eternity');
      expect(row.finalStage).toBe('eternity');
      expect(lateEndings.has(row.ending), '完整行医路径只能得到晚年结局').toBe(true);
      expect(earlyEndings.has(row.ending), '完整行医路径不得落入退学/退培结局').toBe(false);
    } else if (row.terminalReason === 'exit') {
      expect(earlyEndings.has(row.ending), '退出路线的结局必须与退出原因一致').toBe(true);
      expect(row.route.at(-1)).not.toBe('eternity');
    } else {
      expect(row.terminalReason).toBe('crisis');
      expect(row.ending).toBe('mental_crisis');
      expect(row.sanity).toBeLessThanOrEqual(0);
    }
  }

  const completeRows = rows.filter(row => row.terminalReason === 'completed');
  expect(completeRows.length, '矩阵至少应有完整临床线和科研线').toBeGreaterThanOrEqual(8);
  expect(completeRows.filter(row => row.strategy === 'clinical').every(row =>
    row.route.join('>') === 'undergrad>internship>guipei>jobhunt>career>pinnacle>retirement>eternity')).toBe(true);
  expect(completeRows.filter(row => row.strategy === 'research').every(row => {
    const route = row.route as string[];
    return route.includes('master')
      && route.includes('phd')
      && route.slice(-5).join('>') === 'jobhunt>career>pinnacle>retirement>eternity';
  }), '科研路线可经保研/考研直达硕博，也可经规培分流，但必须按真实路由走完职业与晚年').toBe(true);

  const average = (strategy: string, field: 'clinical' | 'research') => {
    const selected = completeRows.filter(row => row.strategy === strategy);
    return selected.reduce((sum, row) => sum + row[field], 0) / selected.length;
  };
  expect(average('clinical', 'clinical'), '临床策略应形成更高临床力')
    .toBeGreaterThan(average('research', 'clinical'));
  expect(average('research', 'research'), '科研策略应形成更高科研力')
    .toBeGreaterThan(average('clinical', 'research'));

  for (const strategy of ['honest', 'clinical', 'research']) {
    for (const profile of ['normal', 'tight']) {
      const top = completeRows.find(row => row.strategy === strategy && row.region === 'top' && row.profile === profile);
      const county = completeRows.find(row => row.strategy === strategy && row.region === 'county' && row.profile === profile);
      if (!top || !county) continue;
      expect(top.careerIncome, `${strategy}/${profile} 三甲职业收入应高于县城`).toBeGreaterThan(county.careerIncome);
      expect(top.careerHousing, `${strategy}/${profile} 三甲房贷不应低于县城`).toBeGreaterThanOrEqual(county.careerHousing);
    }
  }
});
