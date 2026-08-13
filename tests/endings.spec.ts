import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 结局判定的单元级验证：用构造好的 GameState 直接测 determineEnding，
// 不依赖长周期模拟的随机性。专门守住 M3 新结局分支。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
}

test('新结局分支：身败名裂 / 侥幸 / 临床专家 / 科研明星', async ({ page }) => {
  await boot(page);

  const results = await page.evaluate(() => {
    const { en, stats: st } = (window as any).__mod;

    function make(partial: any) {
      const base = st.createDefaultStats();
      return {
        stats: { ...base, ...partial.stats },
        flags: new Set(partial.flags ?? []),
        stage: partial.stage ?? 'career',
        marital: partial.marital ?? 'single',
        spouse: null, hasChild: false, familyAlive: 4,
        school: null, track: null, degree: 'bachelor', score: 0,
        year: 2040, quarter: 1, turnsInStage: 10, guipeiCity: '',
        newsLog: [], endingId: null, affinity: {},
      };
    }

    const cases: Array<{ name: string; state: any; expect: string }> = [
      {
        name: '身败名裂',
        state: make({ flags: ['exposed_ruin', 'has_faked'], stats: { papers: 10, reputation: 80, age: 40 } }),
        expect: 'disgraced',
      },
      {
        name: '侥幸（造假+评上副高+未被重度处理）',
        state: make({ flags: ['has_faked', 'passed_fugao'], stats: { papers: 6, reputation: 60, age: 40 } }),
        expect: 'lucky_fraud',
      },
      {
        name: '临床专家（高临床、低论文）',
        state: make({ flags: [], stats: { clinical: 70, papers: 2, reputation: 55, age: 41 } }),
        expect: 'master_clinician',
      },
      {
        name: '科研明星（高科研+多论文）',
        state: make({ flags: [], stats: { research: 60, papers: 7, knowledge: 75, age: 41 } }),
        expect: 'academic_star',
      },
      {
        name: '本科退学优先于一切',
        state: make({ flags: ['left_undergrad', 'exposed_ruin'], stats: { age: 21 } }),
        expect: 'left_undergrad',
      },
      {
        name: '正高已评上 → 主任医师结局',
        state: make({ flags: ['passed_zhuzhi', 'passed_fugao', 'passed_zhenggao'], stats: { reputation: 55, age: 45, clinical: 30, papers: 2 } }),
        expect: 'chief_at_45',
      },
      {
        name: '造假者评上正高仍被"侥幸"截住',
        state: make({ flags: ['has_faked', 'passed_fugao', 'passed_zhenggao'], stats: { papers: 6, reputation: 60, age: 45 } }),
        expect: 'lucky_fraud',
      },
      {
        name: '诚实默认路径',
        state: make({ flags: [], stats: { clinical: 20, research: 20, papers: 1, reputation: 30, age: 38 } }),
        expect: 'exhausted_attending',
      },
    ];

    // 结局年龄动态化：title/subtitle/desc 的固定年龄按玩家真实年龄改写，
    // 消除"结局页左侧真实年龄 38 vs 标题 45"的矛盾（深挖第五部分 R26）。
    const dyn = en.determineEnding(make({
      flags: ['passed_fugao'], stats: { clinical: 50, reputation: 60, age: 38 },
    }));
    const ageDynamic = {
      titleHasRealAge: dyn.title.includes('38岁'),
      titleNoStatic45: !dyn.title.includes('45岁'),
      finalAgeMatches: dyn.stats.finalAge === 38,
    };

    return {
      cases: cases.map(c => {
        const got = en.determineEnding(c.state).id;
        return { name: c.name, expect: c.expect, got, ok: got === c.expect };
      }),
      ageDynamic,
    };
  });

  for (const r of results.cases) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}: 期望 ${r.expect} → 得到 ${r.got}`);
    expect(r.got, r.name).toBe(r.expect);
  }
  console.log('  结局年龄动态化:', JSON.stringify(results.ageDynamic));
  expect(results.ageDynamic.titleHasRealAge, '结局标题应含真实年龄（38岁）').toBe(true);
  expect(results.ageDynamic.titleNoStatic45, '结局标题不应再写死 45岁').toBe(true);
  expect(results.ageDynamic.finalAgeMatches, '结局 stats.finalAge 应等于玩家真实年龄').toBe(true);
});

test('多策略结局年龄与叙事年龄误差 ≤ 2 岁', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { en, stats: st } = (window as any).__mod;
    const make = (partial: any) => {
      const base = st.createDefaultStats();
      return {
        stats: { ...base, ...partial.stats },
        flags: new Set(partial.flags ?? []),
        stage: partial.stage ?? 'career',
        marital: partial.marital ?? 'single',
        spouse: null, hasChild: false, familyAlive: 4,
        school: null, track: null, degree: 'bachelor', score: 0,
        year: 2040, quarter: 1, turnsInStage: 10, guipeiCity: '',
        newsLog: [], endingId: null, affinity: {},
        assets: partial.assets ?? 0,
        lateLife: partial.lateLife,
        health: partial.health,
        spirit: partial.spirit,
        family: partial.family,
        publicImage: partial.publicImage,
        research: partial.research,
        colleagues: partial.colleagues,
        leisure: partial.leisure,
      };
    };
    const strategies = [
      { name: '稳定副高', ages: [36, 42, 48], partial: { flags: ['passed_fugao'], stats: { reputation: 60, clinical: 40 } } },
      { name: '正高主任', ages: [44, 50], partial: { flags: ['passed_zhenggao'], stats: { reputation: 55 } } },
      { name: '临床专家', ages: [40, 46], partial: { flags: [], stats: { clinical: 70, papers: 2, reputation: 55 } } },
      { name: '基层', ages: [38, 45], partial: { flags: ['offer_grass'], stats: { relations: 40, reputation: 30 } } },
      { name: '身败名裂', ages: [35, 41], partial: { flags: ['exposed_ruin'], stats: { papers: 8, reputation: 70 } } },
      { name: '打工安稳', ages: [30, 38], partial: { flags: ['no_college'], stats: { sanity: 60, money: 20000 } } },
    ];
    const rows = [];
    for (const s of strategies) {
      for (const age of s.ages) {
        const ending = en.determineEnding(make({
          ...s.partial,
          stats: { ...s.partial.stats, age },
        }));
        const ageErr = Math.abs(ending.stats.finalAge - age);
        const yearsErr = Math.abs(ending.stats.totalYears - (age - 18));
        const titleOk = !/\d+岁/.test(ending.title) || ending.title.includes(`${age}岁`);
        rows.push({
          name: `${s.name}@${age}`,
          ageErr,
          yearsErr,
          titleOk,
          finalAge: ending.stats.finalAge,
          id: ending.id,
        });
      }
    }
    return rows;
  });

  for (const row of r) {
    expect(row.ageErr, `${row.name} finalAge`).toBeLessThanOrEqual(2);
    expect(row.yearsErr, `${row.name} totalYears`).toBeLessThanOrEqual(2);
    expect(row.titleOk, `${row.name} 标题年龄`).toBe(true);
    expect(row.ageErr, `${row.name} 应精确对齐真实年龄`).toBe(0);
  }
});
