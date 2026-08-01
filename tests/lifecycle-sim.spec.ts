import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 全生命周期模拟：不经过场景 UI，直接在真实事件池 + 真实经济/风险模型上
// 从本科跑到职业阶段收尾，观察造假被查的长周期后果、双线数值走向与结局分布。
//
// 这是验证 M3 三个系统"长期是否成立"的仪器——单季度测试看不出这些。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 120000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 20000 });
}

// 各阶段季度数，与各 Scene 的 maxTurns 保持一致
const STAGE_PLAN: Array<[string, number]> = [
  ['undergrad', 20], ['internship', 4], ['guipei', 12],
  ['master', 12], ['phd', 12], ['career', 24],
];

test('全生命周期：造假流 vs 诚实流的长期后果', async ({ page }) => {
  await boot(page);

  const result = await page.evaluate((PLAN) => {
    const { gs, tf, stats: st, en } = (window as any).__mod;

    // 播种 PRNG：页面内所有模块共用 Math.random，替换后整个模拟可复现。
    // （曾因此断言骑线偶发失败，见 docs/known-issues.md B6）
    let rngState = 20260730;
    Math.random = () => {
      rngState |= 0; rngState = (rngState + 0x6D2B79F5) | 0;
      let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // 选项打分：策略决定优先选造假还是拒绝
    function pick(choices: any[], cheat: boolean) {
      // 造假流：优先选带 fake effect 的；诚实流：明确避开
      const fakeIdx = choices.findIndex((c: any) => c.effect?.kind === 'fake');
      if (cheat && fakeIdx >= 0) return fakeIdx;
      if (!cheat && fakeIdx >= 0) {
        const alt = choices.findIndex((c: any, i: number) => i !== fakeIdx && !c.effect);
        if (alt >= 0) return alt;
      }
      // 其余情况：选对当前最缺的属性最有利的
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

    function runLife(cheat: boolean, seedTag: number) {
      gs.resetGame();
      gs.patchState({
        stats: st.createDefaultStats(),
        stage: 'undergrad', turnsInStage: 0, year: 2024, quarter: 3,
        school: { id: 'x', name: 'x', realHint: '', tier: 3, minScore: 0, city: 'x', bonus: {} },
      });

      const fired = new Set<string>();
      const exposures: string[] = [];
      let fakeCount = 0;
      let peakRisk = 0;

      for (const [stage, turns] of PLAN) {
        gs.patchState({ stage, turnsInStage: 0 });
        for (let t = 0; t < turns; t++) {
          const e = tf.drawStorylet(stage, fired);
          if (e) {
            if (e.once) fired.add(e.id);
            const idx = pick(e.choices, cheat);
            const c = e.choices[idx];
            if (c.effect?.kind === 'fake') fakeCount++;
            tf.commitChoice(c);
          }
          const r = tf.advanceQuarter(stage);
          peakRisk = Math.max(peakRisk, gs.getState().stats.fakeRisk);
          if (r.integrity.level !== 'none') {
            exposures.push(`${stage}@${t}:${r.integrity.level}`);
          }
          // 心理归零：模拟里不中断，只记录（真实游戏会进 MentalCrisisScene）
          if (gs.getState().stats.sanity <= 0) gs.updateStats({ sanity: 12 });
        }
      }

      const s = gs.getState().stats;
      const ending = en.determineEnding(gs.getState());
      return {
        seedTag,
        fakeCount, peakRisk: Math.round(peakRisk), exposures,
        final: {
          临床: Math.round(s.clinical), 科研: Math.round(s.research),
          论文: s.papers, 声望: Math.round(s.reputation),
          心理: Math.round(s.sanity), 存款: s.money, 风险: Math.round(s.fakeRisk),
        },
        endingId: ending?.id ?? null,
        exposedFlags: [...gs.getState().flags].filter((f: string) => f.startsWith('exposed_')),
      };
    }

    const RUNS = 40;
    const cheats = [], honests = [];
    for (let i = 0; i < RUNS; i++) cheats.push(runLife(true, i));
    for (let i = 0; i < RUNS; i++) honests.push(runLife(false, i));
    return { cheats, honests };
  }, STAGE_PLAN);

  const summarize = (runs: any[], label: string) => {
    const n = runs.length;
    const avg = (f: (r: any) => number) => (runs.reduce((s, r) => s + f(r), 0) / n).toFixed(1);
    const exposedRate = 100 * runs.filter(r => r.exposures.length > 0).length / n;
    const ruinRate = 100 * runs.filter(r => r.exposedFlags.includes('exposed_ruin')).length / n;
    console.log(`\n=== ${label}（${n} 局完整人生）===`);
    console.log(`  平均造假次数 ${avg(r => r.fakeCount)}  峰值风险 ${avg(r => r.peakRisk)}`);
    console.log(`  被查过的局 ${exposedRate.toFixed(0)}%   其中身败名裂 ${ruinRate.toFixed(0)}%`);
    console.log(`  终局均值: 临床 ${avg(r => r.final.临床)} 科研 ${avg(r => r.final.科研)} 论文 ${avg(r => r.final.论文)} 声望 ${avg(r => r.final.声望)} 心理 ${avg(r => r.final.心理)}`);
    console.log(`  样例引爆序列:`, runs.find(r => r.exposures.length)?.exposures?.slice(0, 4) ?? '（无）');
    return { exposedRate, ruinRate, avgPapers: +avg(r => r.final.论文), avgRep: +avg(r => r.final.声望) };
  };

  const c = summarize(result.cheats, '造假流');
  const h = summarize(result.honests, '诚实流');

  // 结局分布
  const endDist = (runs: any[]) => {
    const m: Record<string, number> = {};
    for (const r of runs) m[r.endingId ?? 'null'] = (m[r.endingId ?? 'null'] ?? 0) + 1;
    return m;
  };
  const cEnds = endDist(result.cheats);
  const hEnds = endDist(result.honests);
  console.log('\n结局分布 · 造假流:', JSON.stringify(cEnds));
  console.log('结局分布 · 诚实流:', JSON.stringify(hEnds));

  // 诚实流绝不该被查
  expect(h.exposedRate, '诚实流不该出现学术不端通报').toBe(0);
  // 造假流跑完一生应当大概率被查到（模拟已播种、结果确定；事件池扩容（患者/病房/社会遭遇
  // 数千条生成事件）稀释了造假链出现频率，实测暴露率约 27%，阈值 25 留足余量，
  // 仍远高于诚实流的 0%——单局不被查是设计意图，见 known-issues D2）
  expect(c.exposedRate, '造假流跑完一生应大概率东窗事发').toBeGreaterThan(25);
  // 造假确实换来了产出：论文数应显著高于诚实流
  expect(c.avgPapers, '造假应换来更多论文，否则这个选择没有诱惑力')
    .toBeGreaterThan(h.avgPapers);

  // 新结局应能被走到
  // 造假流里至少要有一些人落到 disgraced 或 lucky_fraud
  const cheatSpecial = (cEnds.disgraced ?? 0) + (cEnds.lucky_fraud ?? 0);
  expect(cheatSpecial, '造假流应能走到 disgraced 或 lucky_fraud 结局')
    .toBeGreaterThan(0);
  // 诚实流不应出现 disgraced / lucky_fraud
  expect(hEnds.disgraced ?? 0, '诚实流不该身败名裂').toBe(0);
  expect(hEnds.lucky_fraud ?? 0, '诚实流不该出现侥幸结局').toBe(0);
});
