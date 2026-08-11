import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: import('@playwright/test').Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('模块5-12具有独立默认状态且64个核心事件全部注册', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, ev } = (window as any).__mod;
    gs.resetGame();
    const s = gs.getState();
    const prefixes = ['mf_', 'rs_', 'co_', 'fa_', 'lv_', 'sp_', 'pi_', 'le_'];
    const counts = Object.fromEntries(prefixes.map(p => [p, ev.ALL_EVENTS.filter((e: any) => e.id.startsWith(p)).length]));
    return {
      counts,
      research: s.research,
      faction: s.mentorFaction,
      colleagues: s.colleagues,
      family: s.family,
      love: s.love,
      spirit: s.spirit,
      publicImage: s.publicImage,
      leisure: s.leisure,
    };
  });

  expect(result.counts).toEqual({ mf_: 8, rs_: 8, co_: 8, fa_: 8, lv_: 8, sp_: 8, pi_: 8, le_: 8 });
  expect(result.research.researchAbility).toBe(5);
  expect(result.faction.faction.level).toBe('fringe');
  expect(result.colleagues.integration).toBe(40);
  expect(result.family.familyFunction).toBe(50);
  expect(result.love.status).toBe('single');
  expect(result.spirit.meaning).toBe(50);
  expect(result.publicImage.publicRisk).toBe(5);
  expect(result.leisure.sideBusiness.type).toBe('none');
});

test('核心事件效果同步旧婚姻字段、新家庭状态与科研状态', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, ev, tf } = (window as any).__mod;
    gs.resetGame();
    const blindDate = ev.ALL_EVENTS.find((e: any) => e.id === 'fa_blind_date');
    tf.commitChoice(blindDate.choices[0], blindDate);
    const dating = gs.getState();
    const project = ev.ALL_EVENTS.find((e: any) => e.id === 'rs_mentor_project');
    tf.commitChoice(project.choices[0], project);
    const after = gs.getState();
    return {
      legacyMarital: dating.marital,
      spouse: dating.spouse,
      loveStatus: dating.love.status,
      spouseType: dating.love.spouse.type,
      familySpouse: dating.family.spouse.exists,
      projectTitle: after.research.papers.inProgress?.title,
      researchAbility: after.research.researchAbility,
      mentorBond: after.mentorFaction.mentorBond,
    };
  });

  expect(result.legacyMarital).toBe('dating');
  expect(result.spouse).toBeTruthy();
  expect(result.loveStatus).toBe('dating');
  expect(result.spouseType).toBe('physician');
  expect(result.familySpouse).toBe(true);
  expect(result.projectTitle).toBe('导师课题子研究');
  expect(result.researchAbility).toBeGreaterThanOrEqual(17);
  expect(result.mentorBond).toBeGreaterThan(30);
});

test('季度结算推进持续网暴并把副业收入写入统一经济结算', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, ev, tf } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'career' });
    const side = ev.ALL_EVENTS.find((e: any) => e.id === 'le_salary_cut_choice');
    tf.commitChoice(side.choices[0], side);
    const attack = ev.ALL_EVENTS.find((e: any) => e.id === 'pi_filmed_clinic');
    tf.commitChoice(attack.choices[2], attack);
    const before = gs.getState();
    const quarter = tf.advanceQuarter('career');
    const after = gs.getState();
    return {
      sideIncome: after.leisure.sideBusiness.quarterlyIncome,
      econIncome: quarter.econ.income,
      financeNote: quarter.econ.financeNote,
      harassmentDuration: after.publicImage.onlineHarassment.duration,
      publicRiskBefore: before.publicImage.publicRisk,
      publicRiskAfter: after.publicImage.publicRisk,
      sanityBefore: before.stats.sanity,
      sanityAfter: after.stats.sanity,
    };
  });

  expect(result.sideIncome).toBe(5000);
  expect(result.econIncome).toBeGreaterThanOrEqual(5000);
  expect(result.financeNote).toContain('副业');
  expect(result.harassmentDuration).toBe(1);
  expect(result.publicRiskAfter).toBeGreaterThan(result.publicRiskBefore);
  expect(result.sanityAfter).toBeLessThan(result.sanityBefore);
});

test('到期危机事件绕过普通地点分类并优先触发', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'career', turnsInStage: 10 });
    gs.setFlag('public_exposure_due');
    const fired = new Set<string>();
    return {
      availableFromWrongSpot: tf.hasStorylet('career', fired, ['study']),
      picked: tf.drawStorylet('career', fired, ['study'])?.id,
    };
  });

  expect(result.availableFromWrongSpot).toBe(true);
  expect(result.picked).toBe('pi_filmed_clinic');
});

test('副业收入只结算一次：现金变化等于季度净额', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, ev, tf } = (window as any).__mod;
    const originalRandom = Math.random;
    Math.random = () => 0.999999;
    try {
      gs.resetGame();
      gs.patchState({ stage: 'career', turnsInStage: 8, stats: { ...gs.getState().stats, money: 100000 } });
      const side = ev.ALL_EVENTS.find((e: any) => e.id === 'le_salary_cut_choice');
      tf.commitChoice(side.choices[0], side);
      const beforeMoney = gs.getState().stats.money;
      const quarter = tf.advanceQuarter('career');
      const afterMoney = gs.getState().stats.money;
      return {
        net: quarter.econ.net,
        income: quarter.econ.income,
        cashDelta: afterMoney - beforeMoney,
        note: quarter.econ.financeNote,
        patientSafety: quarter.patientSafety.level,
      };
    } finally {
      Math.random = originalRandom;
    }
  });

  expect(result.income).toBeGreaterThanOrEqual(5000);
  expect(result.note).toContain('副业');
  expect(result.patientSafety).toBe('none');
  expect(result.cashDelta).toBe(result.net);
});

test('多点执业与线上问诊接入持续副业结算而非一次性发钱', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, ev, tf } = (window as any).__mod;
    const originalRandom = Math.random;
    Math.random = () => 0.999999;
    const exercise = (eventId: string) => {
      gs.resetGame();
      gs.patchState({ stage: 'career', stats: { ...gs.getState().stats, money: 100000 } });
      const event = ev.ALL_EVENTS.find((item: any) => item.id === eventId);
      const beforeChoice = gs.getState().stats.money;
      tf.commitChoice(event.choices[0], event);
      const afterChoice = gs.getState();
      const quarter = tf.advanceQuarter('career');
      const afterQuarter = gs.getState();
      return {
        type: afterChoice.leisure.sideBusiness.type,
        active: afterChoice.leisure.sideBusiness.active,
        quarterlyIncome: afterChoice.leisure.sideBusiness.quarterlyIncome,
        timeCost: afterChoice.leisure.sideBusiness.timeCost,
        immediateCash: afterChoice.stats.money - beforeChoice,
        note: quarter.econ.financeNote,
        quarterCash: afterQuarter.stats.money - afterChoice.stats.money,
        quarterNet: quarter.econ.net,
      };
    };
    try {
      return {
        multiSite: exercise('multi_site_practice'),
        online: exercise('internet_med'),
      };
    } finally {
      Math.random = originalRandom;
    }
  });

  expect(result.multiSite).toMatchObject({
    type: 'multi_site', active: true, quarterlyIncome: 4000, timeCost: 4, immediateCash: 0,
  });
  expect(result.online).toMatchObject({
    type: 'online_consultation', active: true, quarterlyIncome: 2000, timeCost: 3, immediateCash: 0,
  });
  expect(result.multiSite.note).toContain('副业 +¥4,000');
  expect(result.online.note).toContain('副业 +¥2,000');
  expect(result.multiSite.quarterCash).toBe(result.multiSite.quarterNet);
  expect(result.online.quarterCash).toBe(result.online.quarterNet);
});

test('季度财务快照记录患者安全事件后的最终现金', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
      gs.resetGame();
      gs.patchState({
        stage: 'career',
        stats: { ...gs.getState().stats, money: 100000, clinical: 0, stamina: 20 },
      });
      const quarter = tf.advanceQuarter('career');
      const state = gs.getState();
      return {
        patientSafety: quarter.patientSafety.level,
        cash: state.stats.money,
        financeCash: state.finance.cash,
      };
    } finally {
      Math.random = originalRandom;
    }
  });

  expect(result.patientSafety).toBe('major');
  expect(result.financeCash).toBe(result.cash);
});
