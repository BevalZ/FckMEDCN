import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://127.0.0.1:5173/';
const IDS = [
  'diagnostic_workup', 'diagnostic_report_review', 'diagnostic_report_review_assisted',
  'diagnostic_followup', 'diagnostic_shortcut_echo', 'diagnostic_rushed_echo',
];

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('M10 诊断链：检查→报告/鉴别诊断→复查回声可达', async ({ page }) => {
  await boot(page);
  const report = await page.evaluate((ids) => {
    const { ev, tf, gs, stats: statModule } = (window as any).__mod;
    const all = new Map(ev.ALL_EVENTS.map((event: any) => [event.id, event]));
    const base = statModule.createDefaultStats();
    const pool = (stage: string, flags: string[], stats: any, turn: number) =>
      ev.getAvailableEvents(stage, new Set(flags), stats, new Set(), turn, 'single').map((event: any) => event.id);

    const workup = all.get('diagnostic_workup');
    gs.resetGame();
    gs.patchState({ stage: 'internship', turnsInStage: 2, stats: { ...base, knowledge: 55, clinical: 50 } });
    tf.commitChoice(workup.choices[0], workup);
    const high = pool('internship', [...gs.getState().flags], { ...gs.getState().stats }, 3);

    gs.resetGame();
    gs.patchState({ stage: 'internship', turnsInStage: 2, stats: { ...base, knowledge: 25, clinical: 10 } });
    tf.commitChoice(workup.choices[0], workup);
    const low = pool('internship', [...gs.getState().flags], { ...gs.getState().stats }, 3);

    const follow = pool('guipei', ['diagnostic_differential_done'], { ...base }, 1);
    const shortcut = pool('guipei', ['diagnostic_triage_shortcut'], { ...base }, 2);
    const rushed = pool('guipei', ['diagnostic_differential_rushed'], { ...base }, 2);
    return {
      idsPresent: ids.every((id: string) => all.has(id)),
      highReview: high.includes('diagnostic_report_review'),
      highAssisted: high.includes('diagnostic_report_review_assisted'),
      lowReview: low.includes('diagnostic_report_review'),
      lowAssisted: low.includes('diagnostic_report_review_assisted'),
      follow: follow.includes('diagnostic_followup'),
      shortcut: shortcut.includes('diagnostic_shortcut_echo'),
      rushed: rushed.includes('diagnostic_rushed_echo'),
      workupFlags: workup.choices.map((choice: any) => choice.flagSet),
    };
  }, IDS);

  expect(report.idsPresent).toBe(true);
  expect(report.workupFlags).toEqual(['diagnostic_triage_ok', 'diagnostic_triage_shortcut']);
  expect(report.highReview).toBe(true);
  expect(report.highAssisted).toBe(false);
  expect(report.lowReview).toBe(false);
  expect(report.lowAssisted).toBe(true);
  expect(report.follow).toBe(true);
  expect(report.shortcut).toBe(true);
  expect(report.rushed).toBe(true);
});

test('M10 新增事件均有事实审计记录且不写处方剂量', async ({ page }) => {
  await boot(page);
  const auditPath = path.resolve(process.cwd(), 'docs/MEDICAL-FACT-AUDIT.md');
  const audit = fs.readFileSync(auditPath, 'utf8');
  const events = await page.evaluate((ids) => {
    const { ev } = (window as any).__mod;
    return ids.map((id: string) => ev.ALL_EVENTS.find((event: any) => event.id === id));
  }, IDS);
  for (const id of IDS) expect(audit, `${id} 必须在医学事实清单中登记`).toContain(id);
  const text = events.map((event: any) => [event.title, event.body, ...event.choices.map((choice: any) => choice.text)].join(' ')).join(' ');
  expect(text, '诊断链不应出现剂量/处方化表述').not.toMatch(/\b\d+\s*(mg|毫克|片\/日|次\/日)\b/i);
  const workup = events.find((event: any) => event.id === 'diagnostic_workup');
  expect(workup.body, '急性胸闷应点出时间敏感检查（心电图）时序').toContain('心电图');
  expect(events.find((event: any) => event.id === 'diagnostic_report_review').body, '报告解读须强调单一体征/异常不等于诊断')
    .toMatch(/不能.*等同|不能自动等同|不等于/);
});
