import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('成为导师后可以招生、建立自己的势力并留下学生回声', async ({ page }) => {
  await boot(page);

  const result = await page.evaluate(() => {
    const { gs, ev, tf, stats } = (window as any).__mod;
    const base = stats.createDefaultStats();
    gs.resetGame();
    gs.patchState({ stage: 'career', turnsInStage: 5, stats: { ...base, reputation: 72, clinical: 75, research: 65 } });
    gs.setFlag('passed_fugao');

    const count = ev.ALL_EVENTS.filter((event: any) => event.id.startsWith('mentorhood_')).length;
    const trainingIds = [
      'mentorhood_research_orientation',
      'mentorhood_irb_data_management',
      'mentorhood_bedside_round_teaching',
      'mentorhood_first_procedure_supervision',
      'mentorhood_case_writeup_review',
      'mentorhood_grant_student_role',
      'mentorhood_student_thesis_crunch',
      'mentorhood_student_graduation_recommendation',
      'mentorhood_former_student_returns',
    ];
    const canRecruit = ev.getAvailableEvents('career', gs.getState().flags, gs.getState().stats, new Set(), 5, 'single')
      .some((event: any) => event.id === 'mentorhood_quota_notice');
    const quota = ev.ALL_EVENTS.find((event: any) => event.id === 'mentorhood_quota_notice');
    tf.commitChoice(quota.choices[1], quota);
    const afterQuota = gs.getState();

    const canInterview = ev.getAvailableEvents('career', afterQuota.flags, afterQuota.stats, new Set(['mentorhood_quota_notice']), 6, 'single')
      .some((event: any) => event.id === 'mentorhood_interview_list');
    const interview = ev.ALL_EVENTS.find((event: any) => event.id === 'mentorhood_interview_list');
    tf.commitChoice(interview.choices[1], interview);
    const afterInterview = gs.getState();

    const careerTraining = ev.getAvailableEvents('career', afterInterview.flags, afterInterview.stats, new Set(), 12, 'single')
      .filter((event: any) => trainingIds.includes(event.id))
      .map((event: any) => event.id);
    const blockedWithoutStudents = ev.getAvailableEvents('career', new Set(['passed_fugao']), afterInterview.stats, new Set(), 12, 'single')
      .filter((event: any) => trainingIds.includes(event.id))
      .map((event: any) => event.id);
    const earlyStages = ['undergrad', 'guipei', 'master', 'phd', 'jobhunt'];
    const leaksToEarlyStage = earlyStages.flatMap((stage: string) =>
      ev.getAvailableEvents(stage, afterInterview.flags, afterInterview.stats, new Set(), 12, 'single')
        .filter((event: any) => trainingIds.includes(event.id))
        .map((event: any) => `${stage}:${event.id}`),
    );

    const researchTraining = ev.ALL_EVENTS.find((event: any) => event.id === 'mentorhood_research_orientation');
    const ethicsTraining = ev.ALL_EVENTS.find((event: any) => event.id === 'mentorhood_irb_data_management');
    const bedsideTraining = ev.ALL_EVENTS.find((event: any) => event.id === 'mentorhood_bedside_round_teaching');
    const graduation = ev.ALL_EVENTS.find((event: any) => event.id === 'mentorhood_student_graduation_recommendation');
    tf.commitChoice(researchTraining.choices[0], researchTraining);
    tf.commitChoice(ethicsTraining.choices[0], ethicsTraining);
    tf.commitChoice(bedsideTraining.choices[0], bedsideTraining);
    tf.commitChoice(graduation.choices[0], graduation);
    const afterTraining = gs.getState();

    const canOwnSchool = ev.getAvailableEvents('pinnacle', afterInterview.flags, afterInterview.stats, new Set(), 5, 'single')
      .some((event: any) => event.id === 'mentorhood_own_school');
    const canRetirementStudents = ev.getAvailableEvents('retirement', afterInterview.flags, afterInterview.stats, new Set(), 2, 'single')
      .some((event: any) => event.id === 'mentorhood_retirement_students');
    const canFormerStudentReturn = ev.getAvailableEvents('pinnacle', afterTraining.flags, afterTraining.stats, new Set(), 4, 'single')
      .some((event: any) => event.id === 'mentorhood_former_student_returns');

    return {
      count,
      trainingIds,
      careerTraining,
      blockedWithoutStudents,
      leaksToEarlyStage,
      canRecruit,
      canInterview,
      canOwnSchool,
      canRetirementStudents,
      canFormerStudentReturn,
      flags: {
        ownFaction: afterInterview.flags.has('own_faction'),
        mentored: afterInterview.flags.has('mentored'),
        hasStudents: afterInterview.flags.has('has_students'),
        utilitarian: afterInterview.flags.has('mentor_recruited_utilitarian'),
        graduated: afterTraining.flags.has('mentor_student_graduated'),
      },
      faction: afterInterview.mentorFaction.faction,
      factionLevel: afterInterview.mentorFaction.faction.level,
      factionRivalry: afterInterview.mentorFaction.rivalry,
      students: afterInterview.colleagues.students,
      trainedStudents: afterTraining.colleagues.students,
      studentLoyalty: afterInterview.colleagues.studentLoyalty,
    };
  });

  expect(result.count).toBe(17);
  expect(result.careerTraining).toEqual(expect.arrayContaining(result.trainingIds.slice(0, 8)));
  expect(result.blockedWithoutStudents).toEqual([]);
  expect(result.leaksToEarlyStage).toEqual([]);
  expect(result.canRecruit, '副高后应开放第一个招生名额事件').toBe(true);
  expect(result.canInterview, '建立自己的组后应开放招生面试名单').toBe(true);
  expect(result.canOwnSchool, '有自己的势力后巅峰期应能形成梯队事件').toBe(true);
  expect(result.canRetirementStudents, '带过学生后退休期应有学生回声').toBe(true);
  expect(result.canFormerStudentReturn, '学生毕业后应能在后续阶段回来形成传承回声').toBe(true);
  expect(result.flags).toMatchObject({
    ownFaction: true,
    mentored: true,
    hasStudents: true,
    utilitarian: true,
    graduated: true,
  });
  expect(result.faction.name).toBe('转化医学小组');
  expect(result.faction.type).toBe('academic');
  expect(result.faction.resources.research).toBeGreaterThanOrEqual(72);
  expect(result.factionLevel).not.toBe('fringe');
  expect(result.factionRivalry).toBeGreaterThan(0);
  expect(result.students.length).toBeGreaterThanOrEqual(2);
  expect(result.students.some((student: any) => student.type === 'protege')).toBe(true);
  expect(result.students.some((student: any) => student.type === 'utilitarian' && student.betrayalRisk >= 60)).toBe(true);
  expect(result.trainedStudents.every((student: any) => student.researchSkill >= 40)).toBe(true);
  expect(result.trainedStudents.some((student: any) => student.researchSkill >= 45)).toBe(true);
  expect(result.trainedStudents.every((student: any) => student.clinicalSkill >= 40)).toBe(true);
  expect(result.trainedStudents.every((student: any) => student.ethics >= 60)).toBe(true);
  expect(result.trainedStudents.every((student: any) => student.autonomy >= 35)).toBe(true);
  expect(result.studentLoyalty).toBeGreaterThan(40);
});
