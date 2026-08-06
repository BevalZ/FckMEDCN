import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// OPTIMIZATION-ROADMAP R7（学术：一作之争 / 破五唯临床型晋升 / 国自然申报季）
// 与 R8（家庭：错过家庭时刻 / 配偶怨言链 / 子女学医叙事）的回归：
// 1) 每条新事件在满足门控时于预期回合进入候选池；缺 requireFlag 沉底；
//    requireMarital: 'married' 的事件在 single 下整程不可达。
// 2) 每个新 flag 都有设置者与消费者（回声事件），不出现新的死 flag。
// 3) 新事件文案保持玩家称谓性别中立（不出现"爸爸/妈妈"等定向词）。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
}

test('R7/R8 新事件可达性、门控与 flag 消费闭环', async ({ page }) => {
  await boot(page);

  const report = await page.evaluate(() => {
    const { ev, stats: st } = (window as any).__mod;
    const base = st.createDefaultStats();

    // [事件id, 阶段, 需要的flag, 预期首次可达回合, 婚姻状态, stat覆盖, 扫描上限]
    const CASES: Array<[string, string, string[], number, string, Record<string, number>, number]> = [
      // R7 一作之争（硕博）
      ['ms_first_author_dispute', 'master', [], 3, 'single', {}, 12],
      ['ms_first_author_placated_echo', 'master', ['fa_placated'], 5, 'single', {}, 12],
      ['career_first_author_fought_echo', 'career', ['fa_fought'], 4, 'single', {}, 20],
      ['career_first_author_conceded_echo', 'career', ['fa_conceded'], 4, 'single', {}, 20],
      // R7 破五唯临床型晋升（requireStat clinical≥60）
      ['career_clinical_track_review', 'career', ['passed_zhuzhi'], 8, 'single', { clinical: 70 }, 20],
      // R7 国自然申报季
      ['career_nsfc_season', 'career', [], 2, 'single', {}, 20],
      ['career_nsfc_won_echo', 'career', ['nsfc_won'], 3, 'single', {}, 20],
      ['career_nsfc_failed_echo', 'career', ['nsfc_failed'], 3, 'single', {}, 20],
      // R8 家庭时刻
      ['career_missed_family_moment', 'career', ['has_child'], 2, 'married', {}, 20],
      ['career_kept_family_echo', 'career', ['family_moment_kept'], 5, 'married', {}, 20],
      ['career_missed_family_echo', 'career', ['family_moment_missed'], 6, 'married', {}, 20],
      // R8 配偶怨言链
      ['career_spouse_strain', 'career', [], 3, 'married', {}, 20],
      ['career_spouse_echo_talk', 'career', ['spouse_talked'], 5, 'married', {}, 20],
      ['career_spouse_echo_drift', 'career', ['spouse_drifting'], 5, 'married', {}, 20],
      // R8 子女学医
      ['career_child_asks_medicine', 'career', ['has_child'], 9, 'married', {}, 20],
      ['career_child_med_echo', 'career', ['child_med_supported'], 11, 'married', {}, 20],
      ['career_child_deterred_echo', 'career', ['child_med_deterred'], 11, 'married', {}, 20],
      ['career_child_own_choice_echo', 'career', ['child_med_own_choice'], 11, 'married', {}, 20],
    ];

    const rows = CASES.map(([id, stage, needFlags, expectTurn, marital, statOv, maxTurn]) => {
      const stats = { ...base, ...statOv };
      const flags = new Set(needFlags);
      let firstHit = -1;
      for (let turn = 1; turn <= maxTurn; turn++) {
        const pool = ev.getAvailableEvents(stage, flags, { ...stats }, new Set(), turn, marital);
        if (pool.some((e: any) => e.id === id)) { firstHit = turn; break; }
      }
      const evt = ev.ALL_EVENTS.find((e: any) => e.id === id);
      // 缺 requireFlag 时整程不可达
      let gatedOk = true;
      if (evt?.requireFlag) {
        const bare = new Set(needFlags.filter(f => f !== evt.requireFlag));
        for (let turn = 1; turn <= maxTurn; turn++) {
          const pool = ev.getAvailableEvents(stage, bare, { ...stats }, new Set(), turn, marital);
          if (pool.some((e: any) => e.id === id)) { gatedOk = false; break; }
        }
      }
      // requireMarital: 'married' 的事件在 single 下整程不可达
      let maritalOk = true;
      if (evt?.requireMarital === 'married') {
        for (let turn = 1; turn <= maxTurn; turn++) {
          const pool = ev.getAvailableEvents(stage, flags, { ...stats }, new Set(), turn, 'single');
          if (pool.some((e: any) => e.id === id)) { maritalOk = false; break; }
        }
      }
      // requireStat 临床通道：clinical 过低时不可达
      let statOk = true;
      if (evt?.requireStat?.clinical) {
        const low = { ...stats, clinical: 5 };
        for (let turn = 1; turn <= maxTurn; turn++) {
          const pool = ev.getAvailableEvents(stage, flags, low, new Set(), turn, marital);
          if (pool.some((e: any) => e.id === id)) { statOk = false; break; }
        }
      }
      return { id, firstHit, expectTurn, gatedOk, maritalOk, statOk, ok: firstHit === expectTurn && gatedOk && maritalOk && statOk };
    });

    // flag 消费闭环：设置者(choice.flagSet) ↔ 消费者(ev.requireFlag)
    const setBy: Record<string, string[]> = {};
    const requiredBy: Record<string, string[]> = {};
    for (const e of ev.ALL_EVENTS) {
      if (e.requireFlag) (requiredBy[e.requireFlag] ??= []).push(e.id);
      for (const c of e.choices) {
        if (c.flagSet) (setBy[c.flagSet] ??= []).push(e.id);
        // rollOutcome / setFlag effect 也是 flag 设置者（与 flagSet 字面量扫描互补）
        const eff = c.effect;
        if (eff?.kind === 'rollOutcome') {
          if (eff.successFlag) (setBy[eff.successFlag] ??= []).push(e.id);
          if (eff.failFlag) (setBy[eff.failFlag] ??= []).push(e.id);
        }
        if (eff?.kind === 'setFlag' && eff.flag) (setBy[eff.flag] ??= []).push(e.id);
      }
    }
    const CHAINS: Array<[string, string, string]> = [
      ['fa_fought', 'ms_first_author_dispute', 'career_first_author_fought_echo'],
      ['fa_conceded', 'ms_first_author_dispute', 'career_first_author_conceded_echo'],
      ['fa_placated', 'ms_first_author_dispute', 'ms_first_author_placated_echo'],
      ['nsfc_won', 'career_nsfc_season', 'career_nsfc_won_echo'],
      ['nsfc_failed', 'career_nsfc_season', 'career_nsfc_failed_echo'],
      ['family_moment_kept', 'career_missed_family_moment', 'career_kept_family_echo'],
      ['family_moment_missed', 'career_missed_family_moment', 'career_missed_family_echo'],
      ['spouse_talked', 'career_spouse_strain', 'career_spouse_echo_talk'],
      ['spouse_drifting', 'career_spouse_strain', 'career_spouse_echo_drift'],
      ['child_med_supported', 'career_child_asks_medicine', 'career_child_med_echo'],
      ['child_med_deterred', 'career_child_asks_medicine', 'career_child_deterred_echo'],
      ['child_med_own_choice', 'career_child_asks_medicine', 'career_child_own_choice_echo'],
      // 破五唯通道：临床实绩也能拿副高，喂给既有正高事件与结局判定
      ['passed_fugao', 'career_clinical_track_review', 'promote_zhenggao'],
    ];
    const chains = CHAINS.map(([flag, setter, consumer]) => ({
      flag,
      setterOk: (setBy[flag] ?? []).includes(setter),
      consumerOk: (requiredBy[flag] ?? []).includes(consumer),
    }));

    // 称谓性别中立：新事件文案不出现定向家长称谓
    const NEW_IDS = new Set(CASES.map(c => c[0]));
    const gendered = ev.ALL_EVENTS
      .filter((e: any) => NEW_IDS.has(e.id))
      .flatMap((e: any) => [e.title, e.body, ...e.choices.map((c: any) => `${c.text}${c.consequence ?? ''}`)]
        .filter((t: string) => /爸爸|妈妈|父亲(?!节)|母亲(?!节)/.test(t))
        .map(() => e.id));

    // 国自然命中率口径：典型职业中期画像（papers2/knowledge60/rep50）落在 15-30%
    const nsfc = ev.ALL_EVENTS.find((e: any) => e.id === 'career_nsfc_season');
    const roll = nsfc.choices[0].effect;
    const typicalP = roll.base + roll.paperBonus * 2 + roll.knowledgeBonus * 60 + roll.repPer10 * (50 / 10);

    return { rows, chains, gendered, typicalP };
  });

  for (const r of report.rows) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.id}: 首次可达 ${r.firstHit}（预期 ${r.expectTurn}）flag门控${r.gatedOk ? '✓' : '✗'} 婚姻门控${r.maritalOk ? '✓' : '✗'} 属性门控${r.statOk ? '✓' : '✗'}`);
    expect(r.firstHit, `${r.id} 首次可达回合`).toBe(r.expectTurn);
    expect(r.gatedOk, `${r.id} 缺少 requireFlag 时仍可触达`).toBe(true);
    expect(r.maritalOk, `${r.id} requireMarital 失效`).toBe(true);
    expect(r.statOk, `${r.id} requireStat 失效`).toBe(true);
  }
  for (const c of report.chains) {
    console.log(`  ${c.setterOk && c.consumerOk ? '✓' : '✗'} flag ${c.flag}: 设置${c.setterOk ? '✓' : '✗'} 消费${c.consumerOk ? '✓' : '✗'}`);
    expect(c.setterOk, `${c.flag} 无设置者`).toBe(true);
    expect(c.consumerOk, `${c.flag} 无消费者（死 flag）`).toBe(true);
  }
  expect(report.gendered, `新事件出现定向家长称谓: ${report.gendered.join(',')}`).toEqual([]);
  console.log(`  国自然典型命中率 ${(report.typicalP * 100).toFixed(1)}%（现实口径 15-30%）`);
  expect(report.typicalP).toBeGreaterThanOrEqual(0.15);
  expect(report.typicalP).toBeLessThanOrEqual(0.30);
});
