import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('本科正式考研事件不会在大一大二大三出现', async ({ page }) => {
  await boot(page);

  const report = await page.evaluate(() => {
    const { ev, gs } = (window as any).__mod;
    const formalIds = [
      'ug_real_kaoyan_plan',
      'ug_real_kaoyan_written',
      'ug_real_kaoyan_written_top',
      'ug_real_kaoyan_written_result',
      'ug_real_kaoyan_interview',
      'ug_real_kaoyan_admission',
      'ug_real_kaoyan_fail_plan',
      'ug_real_kaoyan_repeater_interview',
      'm2_ug_kaoyan_exam',
      'm2_ug_kaoyan_result',
      'm2_ug_plan_b',
    ];
    const flags = new Set([
      'ug_kaoyan_intent',
      'ug_kaoyan_target_mid',
      'ug_kaoyan_target_top',
      'ug_kaoyan_written_pass',
      'ug_kaoyan_written_fail',
      'ug_kaoyan_iv_pass',
      'ug_kaoyan_iv_fail',
      'ug_kaoyan_done',
      'ug_kaoyan_fail',
      'kaoyan_repeater',
    ]);
    const stats = { ...gs.getState().stats, knowledge: 95, clinical: 80, reputation: 80 };
    const earlyHits: Array<{ turn: number; ids: string[] }> = [];
    for (let turn = 0; turn <= 13; turn++) {
      const ids = ev.getAvailableEvents('undergrad', flags, stats, new Set(), turn, 'single')
        .map((e: any) => e.id)
        .filter((id: string) => formalIds.includes(id));
      if (ids.length) earlyHits.push({ turn, ids });
    }
    return earlyHits;
  });

  expect(report, '正式考研、出分、复试、调剂事件不得早于大四下（turn 14）').toEqual([]);
});

test('本科考研链包含报名、初试、复试、失败出口和二战压力', async ({ page }) => {
  await boot(page);

  const report = await page.evaluate(() => {
    const { ev, gs } = (window as any).__mod;
    const stats = { ...gs.getState().stats, knowledge: 95, clinical: 70, reputation: 70 };
    const has = (turn: number, flags: string[], id: string) =>
      ev.getAvailableEvents('undergrad', new Set(flags), stats, new Set(), turn, 'single')
        .some((e: any) => e.id === id);
    const fail = ev.ALL_EVENTS.find((e: any) => e.id === 'ug_real_kaoyan_fail_plan');
    const repeater = ev.ALL_EVENTS.find((e: any) => e.id === 'ug_real_kaoyan_repeater_interview');
    return {
      planAt14: has(14, [], 'ug_real_kaoyan_plan'),
      writtenMidAt16: has(16, ['ug_kaoyan_target_mid'], 'ug_real_kaoyan_written'),
      writtenTopAt16: has(16, ['ug_kaoyan_target_top'], 'ug_real_kaoyan_written_top'),
      interviewAt17: has(17, ['ug_kaoyan_written_pass'], 'ug_real_kaoyan_interview'),
      failChoices: fail.choices.map((c: any) => c.text),
      repeaterRequires: repeater.requireFlag,
      repeaterBody: repeater.body,
    };
  });

  expect(report.planAt14).toBe(true);
  expect(report.writtenMidAt16).toBe(true);
  expect(report.writtenTopAt16).toBe(true);
  expect(report.interviewAt17).toBe(true);
  expect(report.failChoices).toEqual(expect.arrayContaining([
    '接受调剂，去低一档医院读研',
    '直接工作或先规培，不再空耗',
    '二战一年，但准备好解释空档',
  ]));
  expect(report.repeaterRequires).toBe('kaoyan_repeater');
  expect(report.repeaterBody).toContain('空档');
});

test('六级通过会解锁考研和考博英语面试优势选项', async ({ page }) => {
  await boot(page);

  const report = await page.evaluate(() => {
    const { ev, gs } = (window as any).__mod;
    const visibleTexts = (eventId: string, flags: string[]) => {
      gs.patchState({
        stage: eventId.startsWith('ms_') ? 'master' : 'undergrad',
        stats: { ...gs.getState().stats, knowledge: 90, clinical: 80, reputation: 75, papers: 2 },
        flags: new Set(flags),
      });
      const event = ev.ALL_EVENTS.find((e: any) => e.id === eventId);
      return event.choices.filter((c: any) => ev.choiceVisible(c)).map((c: any) => c.text);
    };
    return {
      ugNoCet6: visibleTexts('ug_real_kaoyan_interview', ['ug_kaoyan_written_pass']),
      ugCet6: visibleTexts('ug_real_kaoyan_interview', ['ug_kaoyan_written_pass', 'passed_cet6']),
      phdNoCet6: visibleTexts('ms_phd_interview', ['phd_material_pass']),
      phdCet6: visibleTexts('ms_phd_interview', ['phd_material_pass', 'passed_cet6']),
    };
  });

  expect(report.ugNoCet6).not.toContain('用六级和文献阅读撑住英语问答');
  expect(report.ugCet6).toContain('用六级和文献阅读撑住英语问答');
  expect(report.phdNoCet6).not.toContain('英语问答稳住，把研究计划说清');
  expect(report.phdCet6).toContain('英语问答稳住，把研究计划说清');
});

test('考研上岸和考博录取才改变后续路由', async ({ page }) => {
  await boot(page);

  const report = await page.evaluate(() => {
    const { gs, tr } = (window as any).__mod;
    const reset = (flags: string[]) => {
      gs.patchState({ flags: new Set(flags), stage: 'undergrad', turnsInStage: 19 });
      return {
        undergrad: tr.nextSceneAfterUndergrad('walk'),
        master: tr.nextSceneAfterMaster('walk'),
      };
    };
    return {
      intentOnly: reset(['ug_kaoyan_intent']),
      kaoyan: reset(['kaoyan']),
      baoyan: reset(['baoyan']),
      masterDefault: reset([]).master,
      willPhdOnly: reset(['will_phd']).master,
      phdAdmitted: reset(['phd_admitted']).master,
      willWorkOverrides: reset(['phd_admitted', 'will_work']).master,
    };
  });

  expect(report.intentOnly.undergrad).toBe('HospitalScene');
  expect(report.kaoyan.undergrad).toBe('MasterWalkScene');
  expect(report.baoyan.undergrad).toBe('MasterWalkScene');
  expect(report.masterDefault).toBe('JobHuntScene');
  expect(report.willPhdOnly).toBe('JobHuntScene');
  expect(report.phdAdmitted).toBe('PhdWalkScene');
  expect(report.willWorkOverrides).toBe('JobHuntScene');
});

test('考博申请链包含导师医院、材料、面试、排名候补和失败退路', async ({ page }) => {
  await boot(page);

  const report = await page.evaluate(() => {
    const { ev, gs } = (window as any).__mod;
    const stats = { ...gs.getState().stats, knowledge: 90, clinical: 70, reputation: 80, papers: 2 };
    const has = (turn: number, flags: string[], id: string) =>
      ev.getAvailableEvents('master', new Set(flags), stats, new Set(), turn, 'single')
        .some((e: any) => e.id === id);
    const start = ev.ALL_EVENTS.find((e: any) => e.id === 'ms_phd_application_start');
    const material = ev.ALL_EVENTS.find((e: any) => e.id === 'ms_phd_material_review');
    const written = ev.ALL_EVENTS.find((e: any) => e.id === 'ms_phd_written_assessment');
    const rank = ev.ALL_EVENTS.find((e: any) => e.id === 'ms_phd_rank_list');
    const fail = ev.ALL_EVENTS.find((e: any) => e.id === 'ms_phd_fail_plan');
    return {
      startsLate: has(8, [], 'ms_phd_application_start'),
      notEarly: has(7, [], 'ms_phd_application_start'),
      writtenAfterMaterial: has(9, ['phd_material_pass'], 'ms_phd_written_assessment'),
      interviewAfterWritten: has(9, ['phd_written_pass'], 'ms_phd_interview'),
      startChoices: start.choices.map((c: any) => c.text),
      materialBody: material.body,
      writtenBody: written.body,
      rankChoices: rank.choices.map((c: any) => c.text),
      failChoices: fail.choices.map((c: any) => c.text),
    };
  });

  expect(report.startsLate).toBe(true);
  expect(report.notEarly).toBe(false);
  expect(report.writtenAfterMaterial).toBe(true);
  expect(report.interviewAfterWritten).toBe(true);
  expect(report.startChoices).toEqual(expect.arrayContaining([
    '投顶级附属医院强导师',
    '投同校熟悉的导师团队',
    '硕士毕业先找工作',
  ]));
  expect(report.materialBody).toContain('导师推荐');
  expect(report.materialBody).toContain('同批报考者');
  expect(report.writtenBody).toContain('专业笔试');
  expect(report.rankChoices).toEqual(expect.arrayContaining(['拟录取，继续读博', '候补，先等一轮', '没进名单，准备退路']));
  expect(report.failChoices).toEqual(expect.arrayContaining(['直接找工作，别错过招聘季', '做科研助理，来年再申请', '换导师换医院再投一轮']));
});

test('毕业前半年体现升学求职与论文答辩冲突，且不提前出现', async ({ page }) => {
  await boot(page);

  const report = await page.evaluate(() => {
    const { ev, gs } = (window as any).__mod;
    const stats = { ...gs.getState().stats, knowledge: 90, clinical: 75, reputation: 75, papers: 2 };
    const has = (stage: string, turn: number, flags: string[], id: string) =>
      ev.getAvailableEvents(stage, new Set(flags), stats, new Set(), turn, 'single')
        .some((e: any) => e.id === id);
    const choices = (id: string) => ev.ALL_EVENTS.find((e: any) => e.id === id).choices.map((c: any) => c.text);
    const body = (id: string) => ev.ALL_EVENTS.find((e: any) => e.id === id).body;
    return {
      ugEarly: has('undergrad', 17, ['ug_kaoyan_written_pass'], 'ug_graduation_thesis_crunch'),
      ugLate: has('undergrad', 18, ['ug_kaoyan_written_pass'], 'ug_graduation_thesis_crunch'),
      msEarly: has('master', 9, ['phd_material_pass'], 'ms_thesis_defense_application_crunch'),
      msLate: has('master', 10, ['phd_material_pass'], 'ms_thesis_defense_application_crunch'),
      phdEarly: has('phd', 13, [], 'phd_dissertation_jobhunt_crunch'),
      phdLate: has('phd', 14, [], 'phd_dissertation_jobhunt_crunch'),
      ugChoices: choices('ug_graduation_thesis_crunch'),
      msChoices: choices('ms_thesis_defense_application_crunch'),
      phdChoices: choices('phd_dissertation_jobhunt_crunch'),
      ugBody: body('ug_graduation_thesis_crunch'),
      msBody: body('ms_thesis_defense_application_crunch'),
      phdBody: body('phd_dissertation_jobhunt_crunch'),
    };
  });

  expect(report.ugEarly).toBe(false);
  expect(report.ugLate).toBe(true);
  expect(report.msEarly).toBe(false);
  expect(report.msLate).toBe(true);
  expect(report.phdEarly).toBe(false);
  expect(report.phdLate).toBe(true);
  expect(report.ugBody).toContain('毕业论文');
  expect(report.ugBody).toContain('考研复试');
  expect(report.msBody).toContain('盲审');
  expect(report.msBody).toContain('博士申请');
  expect(report.phdBody).toContain('医院招聘');
  expect(report.ugChoices).toEqual(expect.arrayContaining(['先保毕业论文和答辩，不让学位出问题', '先投规培和招聘，论文压线交']));
  expect(report.msChoices).toEqual(expect.arrayContaining(['一边改论文，一边跑考博流程', '论文压线，先抓招聘窗口']));
  expect(report.phdChoices).toEqual(expect.arrayContaining(['边返修论文边海投医院', '请导师先写推荐，争取面试排期']));
});
