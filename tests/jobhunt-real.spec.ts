import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 求职写实管线单元测试（引擎级，走 dev 全局 __mod，不 import 模块实例）。
// 覆盖 7 项机制：投简历(学历门槛/时间窗口由事件门控)、笔试/面试概率、本校附属加成、
// 多 offer 计数、签三方(set region flag + signedUnitId)、违约赔钱、导师推荐人情黑箱。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
}

test('求职写实：投简历/本校附属/笔试面试概率/多offer/签三方/违约/人情', async ({ page }) => {
  await boot(page);

  const r = await page.evaluate(() => {
    const { gs, tf, ev } = (window as any).__mod;
    const out: Record<string, unknown> = {};

    // 工具：在受控 Math.random 下提交一个 effect choice
    const origRandom = Math.random;
    const commitEffect = (effect: any) => tf.commitChoice({ delta: {}, effect } as any);

    // —— 1) 投简历 + 本校附属加成标记 ——
    gs.resetGame();
    gs.patchState({ stage: 'jobhunt', school: { id: 'xiehe', name: 'x', realHint: '', tier: 1, minScore: 0, city: 'x', bonus: {} } });
    commitEffect({ kind: 'applyUnit', unitId: 'xiehe_h' });
    out.appliedXiehe = (window as any).__state().flags.has('jh_applied_xiehe_h');
    out.affilXieheWhenAlma = (window as any).__state().flags.has('jh_affil_xiehe_h'); // 母校匹配 → 应置

    gs.resetGame();
    gs.patchState({ stage: 'jobhunt', school: { id: 'beida', name: 'x', realHint: '', tier: 1, minScore: 0, city: 'x', bonus: {} } });
    commitEffect({ kind: 'applyUnit', unitId: 'xiehe_h' });
    out.affilXieheWhenNotAlma = (window as any).__state().flags.has('jh_affil_xiehe_h'); // 非母校 → 不应置

    // —— 2) 笔试/面试概率：Math.random=0 必中，=0.999 必失（p 上限 0.98）——
    gs.resetGame();
    gs.patchState({ stage: 'jobhunt', stats: { ...(window as any).__state().stats, reputation: 50, papers: 3, knowledge: 50, clinical: 50 } });
    Math.random = () => 0;
    commitEffect({ kind: 'rollOutcome', base: 0.5, successFlag: 'T_pass', failFlag: 'T_fail' });
    out.rollPassWhenRandom0 = (window as any).__state().flags.has('T_pass');

    gs.resetGame();
    gs.patchState({ stage: 'jobhunt', stats: { ...(window as any).__state().stats, reputation: 50, papers: 3, knowledge: 50, clinical: 50 } });
    Math.random = () => 0.999;
    commitEffect({ kind: 'rollOutcome', base: 0.5, successFlag: 'T_pass', failFlag: 'T_fail' });
    out.rollFailWhenRandom999 = (window as any).__state().flags.has('T_fail');

    // —— 3) 本校附属加成确实抬高通过概率 ——
    // 同一份属性，无附属 vs 有附属(jh_affil_test)，分别在 random 临界值各跑多次统计命中率
    const trial = (affil: boolean) => {
      let pass = 0;
      for (let i = 0; i < 200; i++) {
        gs.resetGame();
        gs.patchState({ stage: 'jobhunt', stats: { ...(window as any).__state().stats, reputation: 40, papers: 1, knowledge: 30, clinical: 30 } });
        if (affil) (window as any).__state().flags.add('jh_affil_test');
        Math.random = () => 0.6; // 中等随机值
        commitEffect({ kind: 'rollOutcome', base: 0.45, affiliateBonus: 0.18, affiliateFlag: 'jh_affil_test', successFlag: 'A_pass', failFlag: 'A_fail' });
        if ((window as any).__state().flags.has('A_pass')) pass++;
      }
      return pass / 200;
    };
    out.passNoAffil = trial(false);
    out.passWithAffil = trial(true);
    out.affilBoosts = (out.passWithAffil as number) > (out.passNoAffil as number);

    // —— 4) 导师推荐(人情黑箱)加成 ——
    const trialRef = (ref: boolean) => {
      let pass = 0;
      for (let i = 0; i < 200; i++) {
        gs.resetGame();
        gs.patchState({ stage: 'jobhunt', stats: { ...(window as any).__state().stats, reputation: 20 } });
        if (ref) (window as any).__state().flags.add('got_recommend');
        Math.random = () => 0.6;
        commitEffect({ kind: 'rollOutcome', base: 0.4, referralBonus: 0.25, referralFlag: 'got_recommend', successFlag: 'R_pass', failFlag: 'R_fail' });
        if ((window as any).__state().flags.has('R_pass')) pass++;
      }
      return pass / 200;
    };
    out.passNoRef = trialRef(false);
    out.passWithRef = trialRef(true);
    out.refBoosts = (out.passWithRef as number) > (out.passNoRef as number);

    // —— 5) 多 offer 计数 ——
    gs.resetGame();
    commitEffect({ kind: 'receiveOffer', unitId: 'xiehe_h' });
    commitEffect({ kind: 'receiveOffer', unitId: 'shiyi_h' });
    out.jobOffers = (window as any).__state().jobOffers.slice().sort();
    out.offerFlagSet = (window as any).__state().flags.has('offer_xiehe_h') && (window as any).__state().flags.has('offer_shiyi_h');

    // —— 6) 签三方：set region flag + signedUnitId ——
    gs.resetGame();
    commitEffect({ kind: 'signUnit', unitId: 'xiehe_h' });
    const s6 = (window as any).__state();
    out.signedRegionFlag = s6.flags.has('offer_sanjia'); // xiehe_h.regionFlag
    out.signedFlag = s6.flags.has('signed');
    out.signedUnitId = s6.signedUnitId;

    // —— 7) 违约换单位：清旧 region、置新、breachCount++、扣钱 ——
    gs.resetGame();
    gs.patchState({ stats: { ...(window as any).__state().stats, money: 100000, reputation: 50 } });
    commitEffect({ kind: 'signUnit', unitId: 'xiehe_h' }); // 签协华(offer_sanjia)
    const beforeMoney = (window as any).__state().stats.money;
    const beforeBreach = (window as any).__state().counters.breachCount ?? 0;
    // 真实流程：违约选项的 delta 携带违约金，effect 负责切换单位/计数（见 BETTER_OFFER_EVENT）
    tf.commitChoice({ delta: { money: -20000, reputation: -8, sanity: -4 }, effect: { kind: 'breachUnit', unitId: 'shiyi_h' } } as any);
    const s7 = (window as any).__state();
    out.oldRegionCleared = !s7.flags.has('offer_sanjia');
    out.newRegionSet = s7.flags.has('took_hospital_a');
    out.signedUnitIdAfterBreach = s7.signedUnitId;
    out.breachCount = (s7.counters.breachCount ?? 0) - beforeBreach;
    out.moneyDeductedAfterBreach = beforeMoney - s7.stats.money; // 违约金应 > 0
    out.breachedFlag = s7.flags.has('jh_breached');

    Math.random = origRandom;
    return out;
  });

  console.log('求职写实测试结果:', JSON.stringify(r, null, 2));

  expect(r.appliedXiehe, '投简历应置 jh_applied').toBe(true);
  expect(r.affilXieheWhenAlma, '母校匹配应置附属标记').toBe(true);
  expect(r.affilXieheWhenNotAlma, '非母校不应置附属标记').toBe(false);

  expect(r.rollPassWhenRandom0, 'random=0 必中').toBe(true);
  expect(r.rollFailWhenRandom999, 'random=0.999 必失').toBe(true);

  expect(r.affilBoosts, `本校附属应抬高通过率 (无${r.passNoAffil} vs 有${r.passWithAffil})`).toBe(true);
  expect(r.refBoosts, `导师推荐应抬高通过率 (无${r.passNoRef} vs 有${r.passWithRef})`).toBe(true);

  expect(r.jobOffers, '多 offer 应计入 jobOffers 列表').toEqual(['shiyi_h', 'xiehe_h']);
  expect(r.offerFlagSet, 'offer flag 应置').toBe(true);

  expect(r.signedRegionFlag, '签三方应置单位 region flag').toBe(true);
  expect(r.signedFlag, '签三方应置 signed').toBe(true);
  expect(r.signedUnitId, 'signedUnitId 应为该单位').toBe('xiehe_h');

  expect(r.oldRegionCleared, '违约应清旧 region flag').toBe(true);
  expect(r.newRegionSet, '违约应置新 region flag').toBe(true);
  expect(r.signedUnitIdAfterBreach, '违约后 signedUnitId 切换').toBe('shiyi_h');
  expect(r.breachCount, '违约计数 +1').toBe(1);
  expect(r.moneyDeductedAfterBreach, '违约应扣违约金').toBeGreaterThan(0);
  expect(r.breachedFlag, '应置 jh_breached').toBe(true);
});
